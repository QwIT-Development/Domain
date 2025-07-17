# Firebase Studio my beloved
{ pkgs, ... }: {
  channel = "unstable";

  packages = [
    pkgs.bun
  ];

  env = {};
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
      };
      onStart = {};
    };
  };
}
