# Firebase Studio my beloved
{ pkgs, ... }:

{
  channel = "unstable";

  packages = [
    pkgs.bun
    pkgs.podman
    pkgs.podman-compose
    pkgs.fastfetchMinimal
    pkgs.temurin-bin
  ];

  env = {};

  # setup docker
  services.docker.enable = true;

  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "oven.bun-vscode"
      "mgmcdermott.vscode-language-babel"
      "tamasfe.even-better-toml"
      "Prisma.prisma"
      "SonarSource.sonarlint-vscode"
      "BlueGlassBlock.better-json5"
    ];

    previews = {
      enable = false;
      previews = {};
    };

    workspace = {
      onCreate = {
        bun-install = "bun install";
        bun-update = "bun update";
        create-temp = "mkdir /var/tmp";
        ensure-podman-config-dir = "mkdir -p ~/.config/containers/";
        create-podman-policy = ''
           echo '{ "default": [ { "type": "insecureAcceptAnything" } ], "transports": { "docker": { "": [ { "type": "insecureAcceptAnything" } ] } } }' > ~/.config/containers/policy.json
        '';
      };
      onStart = {};
    };
  };
}