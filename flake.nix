{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem ( system:
        let
          pkgs = import nixpkgs { inherit system; };  
        in {
          devShell = with pkgs; mkShell {
            nativeBuildInputs = [
              clang-tools
              nodejs
              python
            ];
          };
        }
    );
}
