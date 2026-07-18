$root = $PSScriptRoot
$output = Join-Path $root "project_files.txt"

function Get-FilesSkippingNodeModules {
    param([string]$Path)

    Get-ChildItem -LiteralPath $Path -File | ForEach-Object {
        $_.FullName.Substring($root.Length + 1)
    }

    Get-ChildItem -LiteralPath $Path -Directory |
        Where-Object { $_.Name -ne "node_modules" } |
        ForEach-Object {
            Get-FilesSkippingNodeModules -Path $_.FullName
        }
}

Get-FilesSkippingNodeModules -Path $root |
    Sort-Object |
    Set-Content -Path $output -Encoding UTF8

notepad $output