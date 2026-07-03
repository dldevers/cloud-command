#!/usr/bin/env bash
set -Eeuo pipefail

# ============================================================
# Kubernetes node prerequisite setup
#
# Run on every node:
#   - lacasa-cp1
#   - lacasa-worker1
#   - lacasa-worker2
#
# Installs and configures:
#   - kernel modules and sysctl settings
#   - swap disablement
#   - containerd
#   - kubelet
#   - kubeadm
#   - kubectl
# ============================================================

readonly KUBERNETES_MINOR="${KUBERNETES_MINOR:-v1.36}"
readonly KUBERNETES_KEYRING="/etc/apt/keyrings/kubernetes-apt-keyring.gpg"
readonly KUBERNETES_REPO_FILE="/etc/apt/sources.list.d/kubernetes.list"

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
    if [[ "$EUID" -ne 0 ]]; then
        die "Run this script with sudo: sudo $0"
    fi
}

require_command() {
    command -v "$1" >/dev/null 2>&1 ||
        die "Required command not found: $1"
}

disable_swap() {
    log "Disabling swap"

    swapoff -a

    if grep -Eq '^[[:space:]]*[^#].*[[:space:]]swap[[:space:]]' /etc/fstab; then
        cp -a /etc/fstab "/etc/fstab.pre-kubernetes-$(date +%Y%m%d-%H%M%S)"

        sed -ri \
            '/^[[:space:]]*[^#].*[[:space:]]swap[[:space:]]/s/^/# disabled by kubernetes-node-setup: /' \
            /etc/fstab
    fi
}

configure_kernel_modules() {
    log "Configuring Kubernetes kernel modules"

    cat > /etc/modules-load.d/kubernetes.conf <<'EOF'
overlay
br_netfilter
EOF

    modprobe overlay
    modprobe br_netfilter
}

configure_sysctl() {
    log "Configuring Kubernetes networking sysctl settings"

    cat > /etc/sysctl.d/99-kubernetes.conf <<'EOF'
net.bridge.bridge-nf-call-iptables  = 1
net.bridge.bridge-nf-call-ip6tables = 1
net.ipv4.ip_forward                 = 1
EOF

    sysctl --system >/dev/null
}

install_dependencies() {
    log "Installing package dependencies"

    apt-get update

    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        apt-transport-https \
        ca-certificates \
        curl \
        gpg \
        containerd
}

configure_containerd() {
    log "Configuring containerd"

    mkdir -p /etc/containerd

    containerd config default > /etc/containerd/config.toml

    # containerd 1.x configuration path
    if grep -q \
        'plugins."io.containerd.grpc.v1.cri".containerd.runtimes.runc.options' \
        /etc/containerd/config.toml; then

        sed -ri \
            '/plugins\."io\.containerd\.grpc\.v1\.cri"\.containerd\.runtimes\.runc\.options/,/^\s*\[/ {
                s/SystemdCgroup = false/SystemdCgroup = true/
            }' \
            /etc/containerd/config.toml
    fi

    # containerd 2.x configuration path
    if grep -q \
        "plugins.'io.containerd.cri.v1.runtime'.containerd.runtimes.runc.options" \
        /etc/containerd/config.toml; then

        sed -ri \
            "/plugins\.'io\.containerd\.cri\.v1\.runtime'\.containerd\.runtimes\.runc\.options/,/^\s*\[/ {
                s/SystemdCgroup = false/SystemdCgroup = true/
            }" \
            /etc/containerd/config.toml
    fi

    if ! grep -q 'SystemdCgroup = true' /etc/containerd/config.toml; then
        die "Unable to enable SystemdCgroup in /etc/containerd/config.toml"
    fi

    systemctl daemon-reload
    systemctl enable --now containerd
    systemctl restart containerd

    systemctl is-active --quiet containerd ||
        die "containerd did not start successfully"
}

configure_kubernetes_repository() {
    log "Configuring Kubernetes ${KUBERNETES_MINOR} package repository"

    install -d -m 0755 /etc/apt/keyrings

    rm -f "$KUBERNETES_KEYRING"

    curl -fsSL \
        "https://pkgs.k8s.io/core:/stable:/${KUBERNETES_MINOR}/deb/Release.key" |
        gpg --dearmor \
            --yes \
            -o "$KUBERNETES_KEYRING"

    chmod 0644 "$KUBERNETES_KEYRING"

    cat > "$KUBERNETES_REPO_FILE" <<EOF
deb [signed-by=${KUBERNETES_KEYRING}] https://pkgs.k8s.io/core:/stable:/${KUBERNETES_MINOR}/deb/ /
EOF

    chmod 0644 "$KUBERNETES_REPO_FILE"
}

install_kubernetes_packages() {
    log "Installing kubelet, kubeadm, and kubectl"

    apt-get update

    DEBIAN_FRONTEND=noninteractive apt-get install -y \
        kubelet \
        kubeadm \
        kubectl

    apt-mark hold \
        kubelet \
        kubeadm \
        kubectl

    systemctl enable kubelet
}

verify_configuration() {
    log "Verifying node configuration"

    printf '\nHostname:\n'
    hostname

    printf '\nNode addresses:\n'
    ip -br -4 addr

    printf '\nSwap:\n'
    if swapon --show | grep -q .; then
        swapon --show
        die "Swap is still enabled"
    else
        echo "disabled"
    fi

    printf '\nKernel modules:\n'
    lsmod | grep -E '^(overlay|br_netfilter)' || true

    printf '\nIPv4 forwarding:\n'
    sysctl net.ipv4.ip_forward

    printf '\ncontainerd:\n'
    containerd --version
    systemctl is-active containerd

    printf '\nKubernetes packages:\n'
    kubeadm version -o short
    kubelet --version
    kubectl version --client
}

main() {
    require_root

    for command_name in \
        apt-get \
        curl \
        gpg \
        grep \
        ip \
        sed \
        systemctl; do
        require_command "$command_name"
    done

    log "Starting Kubernetes node setup on $(hostname)"

    disable_swap
    configure_kernel_modules
    configure_sysctl
    install_dependencies
    configure_containerd
    configure_kubernetes_repository
    install_kubernetes_packages
    verify_configuration

    log "Kubernetes node setup completed successfully"
    warn "The kubelet may remain inactive until kubeadm init or kubeadm join is run."
}

main "$@"
