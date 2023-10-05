# Set the base image
FROM ubuntu:22.04

# Set WORKDIR
WORKDIR /home/gateway

# Dockerfile author / maintainer
LABEL maintainer="Michael Feng <mike@hummingbot.org>"

# Build arguments
ARG BRANCH=""
ARG COMMIT=""
ARG BUILD_DATE=""

LABEL branch=${BRANCH}
LABEL commit=${COMMIT}
LABEL date=${BUILD_DATE}

# Set ENV variables
ENV COMMIT_BRANCH=${BRANCH}
ENV COMMIT_SHA=${COMMIT}
ENV BUILD_DATE=${DATE}
ENV INSTALLATION_TYPE=docker

# Install system dependencies
RUN apt-get update && \
    apt-get install -y sudo libusb-1.0 build-essential ssh swig git opensc openssl libssl-dev wget xclip curl && \
    rm -rf /var/lib/apt/lists/*

# Install Node.js v18.16.0
RUN curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && \
    sudo apt-get install -y nodejs

# Verify node installation
RUN node --version && npm --version

# Install CloudHSM
RUN wget https://s3.amazonaws.com/cloudhsmv2-software/CloudHsmClient/Jammy/cloudhsm-pkcs11_5.10.0-1_u22.04_amd64.deb && \
    wget https://s3.amazonaws.com/cloudhsmv2-software/CloudHsmClient/Jammy/cloudhsm-cli_5.10.0-1_u22.04_amd64.deb && \
    dpkg -i cloudhsm-pkcs11_5.10.0-1_u22.04_amd64.deb && \
    dpkg -i cloudhsm-cli_5.10.0-1_u22.04_amd64.deb && \
    rm -f cloudhsm-pkcs11_5.10.0-1_u22.04_amd64.deb cloudhsm-cli_5.10.0-1_u22.04_amd64.deb

# Copy customerCA.crt into the Docker image (Assuming you have it in the context)
COPY customerCA.crt /opt/cloudhsm/etc/

# Configure CloudHSM
RUN /opt/cloudhsm/bin/configure-pkcs11 -a 172.31.13.106 && \
    /opt/cloudhsm/bin/configure-pkcs11 --hsm-ca-cert /opt/cloudhsm/etc/customerCA.crt && \
    /opt/cloudhsm/bin/configure-cli -a 172.31.13.106 && \
    /opt/cloudhsm/bin/configure-pkcs11 --disable-key-availability-check && \
    /opt/cloudhsm/bin/configure-cli --disable-key-availability-check

# Create mount points
RUN mkdir -p /home/gateway/conf /home/gateway/logs /home/gateway/db /home/gateway/certs

# Copy files
COPY . .

# Install Node.js dependencies and compile
RUN npm install -g yarn && \
    yarn install && \
    yarn build

# Expose port 15888 - note that docs port is 8080
EXPOSE 15888

# Set the default command to run when starting the container
CMD yarn run start
