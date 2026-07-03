#!/usr/bin/env bash
set -Eeuo pipefail

# LaCasa three-node UTM cluster bootstrap.
# Assumes all VMs use UTM Shared Network on 192.168.64.0/24.

readonly SSH_USER="${SSH_USER:-$USER}"
readonly PREFIX_LENGTH="24"
readonly GATEWAY_IP="192.168.64.1"
readonly DNS1="192.168.64.1"
readonly DNS2="1.1.1.1"

readonly CP1_NAME="lacasa-cp1"
readonly CP1_IP="192.168.64.10"

readonly WORKER1_NAME="lacasa-worker1"
readonly WORKER1_IP="192.168.64.11"

readonly WORKER2_NAME="lacasa-worker2"
readonly WORKER2_IP="192.168.64.12"

readonly SSH_KEY="${HOME}/.ssh/id_ed25519"
readonly REMOTE_HELPER="/tmp/lacasa-configure-node.sh"

log() {
    printf '\n\033[1;36m==> %s\033[0m\n' "$*"
}

warn() {
    printf '\n\033[1;33mWARNING: %s\033[0m\n' "$*" >&2
}

die() {
    printf '\n\033[1;31mERROR: %s\033[0m\n' "$*" >&2
    exit 1
}

require_command() {
    command -v "$1" >/dev/null 2>&1 ||
        die "Required command not found: $1"
}

valid_ipv4() {
    local ip="$1"
    local octet
    local -a parts

    IFS='.' read -r -a parts <<< "$ip"

    [[ ${#parts[@]} -eq 4 ]] || return 1

    for octet in "${parts[@]}"; do
        [[ "$octet" =~ ^[0-9]+$ ]] || return 1
        (( octet >= 0 && octet <= 255 )) || return 1
    done
}

prompt_ip() {
    local label="$1"
    local default_ip="$2"
    local value

    while true; do
        read -r -p "${label} [${default_ip}]: " value
        value="${value:-$default_ip}"

        if valid_ipv4 "$value"; then
            printf '%s\n' "$value"
            return 0
        fi

        warn "Invalid IPv4 address: $value"
    done
}

forget_host_key() {
    ssh-keygen -R "$1" >/dev/null 2>&1 || true
}

wait_for_ssh() {
    local ip="$1"
    local name="$2"

    log "Waiting for ${name} at ${ip}"

    forget_host_key "$ip"

    for _ in {1..45}; do
        if ssh \
            -o BatchMode=yes \
            -o ConnectTimeout=2 \
            -o StrictHostKeyChecking=accept-new \
            "${SSH_USER}@${ip}" \
            true >/dev/null 2>&1; then

            printf '%s is reachable at %s\n' "$name" "$ip"
            return 0
        fi

        sleep 2
    done

    die "${name} did not become reachable at ${ip}"
}

create_helper() {
    cat > "$REMOTE_HELPER" <<'NODE_HELPER'
#!/usr/bin/env bash
set -Eeuo pipefail

NODE_NAME="${1:?node name required}"
STATIC_IP="${2:?static IP required}"
PREFIX_LENGTH="${3:?prefix required}"
GATEWAY_IP="${4:?gateway required}"
DNS1="${5:?primary DNS required}"
DNS2="${6:?secondary DNS required}"

CP1_NAME="${7:?cp1 name required}"
CP1_IP="${8:?cp1 IP required}"

WORKER1_NAME="${9:?worker1 name required}"
WORKER1_IP="${10:?worker1 IP required}"

WORKER2_NAME="${11:?worker2 name required}"
WORKER2_IP="${12:?worker2 IP required}"

timestamp="$(date +%Y%m%d-%H%M%S)"
backup_dir="/var/backups/lacasa-netplan/${timestamp}"

interface="$(
    ip -4 route show default |
    awk 'NR == 1 {print $5}'
)"

if [[ -z "$interface" ]]; then
    interface="$(
        ip -br link |
        awk '$1 != "lo" && $2 == "UP" {print $1; exit}'
    )"
fi

if [[ -z "$interface" ]]; then
    echo "Could not determine network interface." >&2
    exit 1
fi

echo "Configuring ${NODE_NAME} on ${interface} as ${STATIC_IP}/${PREFIX_LENGTH}"

hostnamectl set-hostname "$NODE_NAME"

cp -a /etc/hosts "/etc/hosts.pre-lacasa-${timestamp}"

awk '
    BEGIN {skip=0}
    /^# BEGIN LACASA CLUSTER$/ {skip=1; next}
    /^# END LACASA CLUSTER$/   {skip=0; next}
    skip == 0                  {print}
' /etc/hosts > /tmp/hosts.lacasa

cat >> /tmp/hosts.lacasa <<EOF_HOSTS

# BEGIN LACASA CLUSTER
${CP1_IP} ${CP1_NAME} cp1
${WORKER1_IP} ${WORKER1_NAME} worker1
${WORKER2_IP} ${WORKER2_NAME} worker2
# END LACASA CLUSTER
EOF_HOSTS

install \
    -o root \
    -g root \
    -m 0644 \
    /tmp/hosts.lacasa \
    /etc/hosts

rm -f /tmp/hosts.lacasa

mkdir -p "$backup_dir"

shopt -s nullglob
netplan_files=(
    /etc/netplan/*.yaml
    /etc/netplan/*.yml
)

if ((${#netplan_files[@]})); then
    cp -a "${netplan_files[@]}" "$backup_dir/"
    rm -f "${netplan_files[@]}"
fi

shopt -u nullglob

cat > /etc/netplan/00-lacasa-static.yaml <<EOF_NETPLAN
network:
  version: 2
  ethernets:
    ${interface}:
      dhcp4: false
      dhcp6: true
      addresses:
        - ${STATIC_IP}/${PREFIX_LENGTH}
      routes:
        - to: default
          via: ${GATEWAY_IP}
      nameservers:
        addresses:
          - ${DNS1}
          - ${DNS2}
EOF_NETPLAN

chmod 600 /etc/netplan/00-lacasa-static.yaml

echo
echo "Generated Netplan configuration:"
cat /etc/netplan/00-lacasa-static.yaml

echo
echo "Validating Netplan configuration..."
netplan generate

echo "Netplan validated."
echo "Backup stored in ${backup_dir}"

nohup bash -c '
    sleep 2
    netplan apply
' >/var/log/lacasa-netplan-apply.log 2>&1 &

echo "Network apply scheduled. This connection may close."
NODE_HELPER

    chmod 700 "$REMOTE_HELPER"
}

install_key() {
    local ip="$1"
    local name="$2"

    log "Installing CP1 SSH key on ${name} (${ip})"

    ssh-copy-id \
        -i "${SSH_KEY}.pub" \
        -o StrictHostKeyChecking=accept-new \
        "${SSH_USER}@${ip}"
}

configure_remote() {
    local current_ip="$1"
    local name="$2"
    local target_ip="$3"

    log "Configuring ${name}: ${current_ip} -> ${target_ip}"

    scp \
        -o StrictHostKeyChecking=accept-new \
        "$REMOTE_HELPER" \
        "${SSH_USER}@${current_ip}:${REMOTE_HELPER}"

    ssh \
        -tt \
        -o StrictHostKeyChecking=accept-new \
        "${SSH_USER}@${current_ip}" \
        "sudo ${REMOTE_HELPER} \
        '${name}' \
        '${target_ip}' \
        '${PREFIX_LENGTH}' \
        '${GATEWAY_IP}' \
        '${DNS1}' \
        '${DNS2}' \
        '${CP1_NAME}' \
        '${CP1_IP}' \
        '${WORKER1_NAME}' \
        '${WORKER1_IP}' \
        '${WORKER2_NAME}' \
        '${WORKER2_IP}'" || true

    wait_for_ssh "$target_ip" "$name"
}

configure_local_cp1() {
    log "Configuring ${CP1_NAME}: current address -> ${CP1_IP}"

    sudo "$REMOTE_HELPER" \
        "$CP1_NAME" \
        "$CP1_IP" \
        "$PREFIX_LENGTH" \
        "$GATEWAY_IP" \
        "$DNS1" \
        "$DNS2" \
        "$CP1_NAME" \
        "$CP1_IP" \
        "$WORKER1_NAME" \
        "$WORKER1_IP" \
        "$WORKER2_NAME" \
        "$WORKER2_IP"

    warn "CP1 is moving to ${CP1_IP}."
    warn "Reconnect with: ssh ${SSH_USER}@${CP1_IP}"
}

main() {
    local current_cp1_ip
    local worker1_current_ip
    local worker2_current_ip
    local confirmation

    for command_name in \
        awk \
        ip \
        netplan \
        scp \
        ssh \
        ssh-copy-id \
        ssh-keygen; do

        require_command "$command_name"
    done

    current_cp1_ip="$(
        hostname -I |
        awk '{print $1}'
    )"

    log "LaCasa cluster bootstrap"

    printf 'Current CP1 address: %s\n' "$current_cp1_ip"

    worker1_current_ip="$(
        prompt_ip \
            "Worker1 current address" \
            "$WORKER1_IP"
    )"

    worker2_current_ip="$(
        prompt_ip \
            "Worker2 current address" \
            "$WORKER2_IP"
    )"

    printf '\nPlanned addresses:\n'
    printf '  %-18s %s -> %s\n' \
        "$CP1_NAME" \
        "$current_cp1_ip" \
        "$CP1_IP"

    printf '  %-18s %s -> %s\n' \
        "$WORKER1_NAME" \
        "$worker1_current_ip" \
        "$WORKER1_IP"

    printf '  %-18s %s -> %s\n' \
        "$WORKER2_NAME" \
        "$worker2_current_ip" \
        "$WORKER2_IP"

    read -r -p $'\nContinue? [y/N] ' confirmation

    [[ "$confirmation" =~ ^[Yy]$ ]] ||
        die "Bootstrap cancelled."

    if [[ ! -f "$SSH_KEY" ]]; then
        log "Creating CP1 Ed25519 SSH key"

        install \
            -d \
            -m 0700 \
            "${HOME}/.ssh"

        ssh-keygen \
            -t ed25519 \
            -f "$SSH_KEY" \
            -N '' \
            -C "${SSH_USER}@${CP1_NAME}"
    else
        log "Using existing SSH key: ${SSH_KEY}"
    fi

    install_key \
        "$worker1_current_ip" \
        "$WORKER1_NAME"

    install_key \
        "$worker2_current_ip" \
        "$WORKER2_NAME"

    create_helper

    # Configure workers first so CP1 remains available as the
    # orchestration node until the final step.
    configure_remote \
        "$worker1_current_ip" \
        "$WORKER1_NAME" \
        "$WORKER1_IP"

    configure_remote \
        "$worker2_current_ip" \
        "$WORKER2_NAME" \
        "$WORKER2_IP"

    log "Verifying worker-to-worker connectivity"

    ssh \
        "${SSH_USER}@${WORKER1_IP}" \
        "ping -c 2 '${WORKER2_IP}'"

    ssh \
        "${SSH_USER}@${WORKER2_IP}" \
        "ping -c 2 '${WORKER1_IP}'"

    configure_local_cp1
}

main "$@"
