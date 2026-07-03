#!/usr/bin/env bash
set -Eeuo pipefail

# ============================================================
# Initialize the LaCasa Kubernetes control plane.
#
# Run only on:
#   lacasa-cp1
#
# Assumptions:
#   API address:    192.168.64.10
#   Pod CIDR:       10.244.0.0/16
#   Service CIDR:   10.96.0.0/12
#   Runtime:        containerd
#   CNI:            Flannel
# ============================================================

readonly CONTROL_PLANE_IP="${CONTROL_PLANE_IP:-192.168.64.10}"
readonly CONTROL_PLANE_ENDPOINT="${CONTROL_PLANE_ENDPOINT:-lacasa-cp1:6443}"
readonly POD_CIDR="${POD_CIDR:-10.244.0.0/16}"
readonly SERVICE_CIDR="${SERVICE_CIDR:-10.96.0.0/12}"
readonly CRI_SOCKET="${CRI_SOCKET:-unix:///run/containerd/containerd.sock}"
readonly KUBECONFIG_OWNER="${SUDO_USER:-$USER}"
readonly FLANNEL_MANIFEST_URL="https://github.com/flannel-io/flannel/releases/latest/download/kube-flannel.yml"
readonly JOIN_COMMAND_FILE="/home/${KUBECONFIG_OWNER}/kubeadm-worker-join.sh"

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

require_root() {
    [[ "$EUID" -eq 0 ]] ||
        die "Run with sudo: sudo $0"
}

require_command() {
    command -v "$1" >/dev/null 2>&1 ||
        die "Required command not found: $1"
}

verify_host() {
    local hostname_value

    hostname_value="$(hostname)"

    [[ "$hostname_value" == "lacasa-cp1" ]] ||
        die "This script must run on lacasa-cp1, not ${hostname_value}"

    ip -4 addr show |
        grep -q "$CONTROL_PLANE_IP" ||
        die "Control-plane address ${CONTROL_PLANE_IP} was not found"
}

verify_not_initialized() {
    if [[ -f /etc/kubernetes/admin.conf ]]; then
        die "This node already appears initialized: /etc/kubernetes/admin.conf exists"
    fi
}

preflight_images() {
    log "Pulling Kubernetes control-plane images"

    kubeadm config images pull \
        --cri-socket "$CRI_SOCKET"
}

initialize_control_plane() {
    log "Initializing Kubernetes control plane"

    kubeadm init \
        --apiserver-advertise-address "$CONTROL_PLANE_IP" \
        --control-plane-endpoint "$CONTROL_PLANE_ENDPOINT" \
        --pod-network-cidr "$POD_CIDR" \
        --service-cidr "$SERVICE_CIDR" \
        --cri-socket "$CRI_SOCKET"
}

configure_kubectl() {
    local user_home
    local user_group

    log "Configuring kubectl for ${KUBECONFIG_OWNER}"

    user_home="$(
        getent passwd "$KUBECONFIG_OWNER" |
        cut -d: -f6
    )"

    [[ -n "$user_home" ]] ||
        die "Could not determine home directory for ${KUBECONFIG_OWNER}"

    user_group="$(
        id -gn "$KUBECONFIG_OWNER"
    )"

    install \
        -d \
        -o "$KUBECONFIG_OWNER" \
        -g "$user_group" \
        -m 0700 \
        "${user_home}/.kube"

    install \
        -o "$KUBECONFIG_OWNER" \
        -g "$user_group" \
        -m 0600 \
        /etc/kubernetes/admin.conf \
        "${user_home}/.kube/config"
}

install_flannel() {
    log "Installing Flannel CNI"

    sudo -u "$KUBECONFIG_OWNER" \
        kubectl apply -f "$FLANNEL_MANIFEST_URL"
}

create_join_command() {
    local user_home
    local user_group
    local join_command

    log "Generating worker join command"

    user_home="$(
        getent passwd "$KUBECONFIG_OWNER" |
        cut -d: -f6
    )"

    user_group="$(
        id -gn "$KUBECONFIG_OWNER"
    )"

    join_command="$(
        kubeadm token create \
            --ttl 24h \
            --print-join-command
    )"

    cat > "$JOIN_COMMAND_FILE" <<EOF
#!/usr/bin/env bash
set -Eeuo pipefail

sudo ${join_command} \
    --cri-socket '${CRI_SOCKET}'
EOF

    chown \
        "$KUBECONFIG_OWNER:$user_group" \
        "$JOIN_COMMAND_FILE"

    chmod 700 "$JOIN_COMMAND_FILE"

    printf '\nWorker join command saved to:\n%s\n' \
        "$JOIN_COMMAND_FILE"

    printf '\nJoin command:\n%s\n' \
        "$join_command"
}

wait_for_system_pods() {
    log "Waiting for Kubernetes system pods"

    sudo -u "$KUBECONFIG_OWNER" \
        kubectl wait \
            --for=condition=Ready \
            pods \
            --all \
            --all-namespaces \
            --timeout=300s ||
        warn "Not every system pod became Ready within five minutes"

    sudo -u "$KUBECONFIG_OWNER" \
        kubectl get nodes -o wide

    sudo -u "$KUBECONFIG_OWNER" \
        kubectl get pods --all-namespaces -o wide
}

main() {
    require_root

    for command_name in \
        cut \
        getent \
        grep \
        id \
        ip \
        kubeadm \
        kubectl; do
        require_command "$command_name"
    done

    verify_host
    verify_not_initialized
    preflight_images
    initialize_control_plane
    configure_kubectl
    install_flannel
    create_join_command
    wait_for_system_pods

    log "Kubernetes control plane initialized successfully"
    warn "Workers have not joined yet."
    warn "Run ${JOIN_COMMAND_FILE} on each worker."
}

main "$@"
