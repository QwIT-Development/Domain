{ pkgs, ... }: {
  channel = "unstable";

  packages = [
    pkgs.bun
    # pkgs.go
    # pkgs.python311
    # pkgs.python311Packages.pip
    # pkgs.nodejs_20
    # pkgs.nodePackages.nodemon
  ];

  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      # "vscodevim.vim"
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
      onStart = {
        # Example: start a background task to watch and re-build backend code
        # watch-backend = "npm run watch-backend";
      };
    };
  };
}
