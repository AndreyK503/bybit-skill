# Installer of the read-only bybit skill for Windows PowerShell 5.1+ and PowerShell 7:
#   irm https://raw.githubusercontent.com/AndreyK503/bybit-skill/main/install.ps1 | iex
#
# Same behaviour as install.sh:
#   1. Asks where to install (BYBIT_SCOPE=global|project skips the question):
#        global  - ~\.claude\skills\bybit (Claude Code, all projects) and
#                  ~\.agents\skills\bybit (shared agents dir); default;
#        project - .\.claude\skills\bybit, current project only.
#   2. Downloads bybit.skill from GitHub (or BYBIT_SKILL_FILE=<path>) and unpacks it,
#      removing the previous version.
#   3. Creates ~\.config\bybit\.env with empty key lines if it does not exist.
#      The key always lives outside the project; an existing file is left untouched.
#
# ASCII only: Windows PowerShell 5.1 reads BOM-less files as ANSI.
# No `exit`: under `irm | iex` it would close the user's PowerShell window.

& {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'

  $repo = if ($env:BYBIT_REPO) { $env:BYBIT_REPO } else { 'AndreyK503/bybit-skill' }
  $ref = if ($env:BYBIT_REF) { $env:BYBIT_REF } else { 'main' }
  $skillUrl = "https://raw.githubusercontent.com/$repo/$ref/bybit.skill"
  $configDir = Join-Path $HOME '.config\bybit'
  $envFile = Join-Path $configDir '.env'

  $scope = $env:BYBIT_SCOPE
  if (-not $scope) {
    $projectSkills = Join-Path (Get-Location) '.claude\skills'
    Write-Host 'Where to install the skill?'
    Write-Host '  1) globally - all projects (~\.claude\skills) [default]'
    Write-Host "  2) current project only ($projectSkills)"
    $answer = Read-Host 'Choice [1]'
    $scope = switch ($answer) { '' { 'global' } '1' { 'global' } '2' { 'project' } default { $answer } }
  }
  $skillDirs = switch ($scope) {
    'global' { @((Join-Path $HOME '.claude\skills'), (Join-Path $HOME '.agents\skills')) }
    'project' { @(Join-Path (Get-Location) '.claude\skills') }
    default { throw "Unknown choice '$scope': answer 1 or 2, or set BYBIT_SCOPE=global or BYBIT_SCOPE=project." }
  }

  $node = Get-Command node -ErrorAction SilentlyContinue
  if (-not $node) {
    Write-Host 'Warning: Node.js not found. The skill will be installed, but the CLI needs Node.js 20+ (nodejs.org, LTS).'
  } elseif ([int]((& node --version) -replace '^v(\d+).*', '$1') -lt 20) {
    Write-Host 'Warning: Node.js is older than 20. The skill will be installed, but update Node to 20+ for the CLI.'
  }

  # Expand-Archive in PowerShell 5.1 accepts only the .zip extension.
  $tmp = Join-Path ([IO.Path]::GetTempPath()) ("bybit-" + [guid]::NewGuid())
  New-Item -ItemType Directory -Path $tmp | Out-Null
  $zip = Join-Path $tmp 'bybit.zip'
  try {
    if ($env:BYBIT_SKILL_FILE) {
      if (-not (Test-Path $env:BYBIT_SKILL_FILE)) { throw "Local package not found: $env:BYBIT_SKILL_FILE" }
      Copy-Item $env:BYBIT_SKILL_FILE $zip
      Write-Host "Local package: $env:BYBIT_SKILL_FILE"
    } else {
      # Windows PowerShell 5.1 may default to TLS 1.0, which GitHub refuses.
      [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12
      Write-Host "Downloading bybit.skill ($ref)..."
      Invoke-WebRequest -Uri $skillUrl -OutFile $zip -UseBasicParsing
    }

    foreach ($dir in $skillDirs) {
      New-Item -ItemType Directory -Force -Path $dir | Out-Null
      $target = Join-Path $dir 'bybit'
      if (Test-Path $target) { Remove-Item -Recurse -Force $target }
      Expand-Archive -Path $zip -DestinationPath $dir -Force
      Write-Host "Installed: $target"
    }
  } finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }

  New-Item -ItemType Directory -Force -Path $configDir | Out-Null
  if (Test-Path $envFile) {
    Write-Host "$envFile already exists, left untouched."
  } else {
    $template = @'
# Bybit API key, Read-Only. This is a secret: never paste it into a chat.
# Create it on the Bybit site: API management -> system-generated key, Read-Only.
BYBIT_API_KEY=
BYBIT_API_SECRET=
'@
    # UTF-8 without BOM: dotenv would otherwise see the BOM as part of the first line.
    [IO.File]::WriteAllText($envFile, $template + "`n", (New-Object Text.UTF8Encoding($false)))
    Write-Host "Created $envFile - put your key and secret there."
  }

  Write-Host ''
  Write-Host 'Done. Next:'
  Write-Host "  1) Put BYBIT_API_KEY and BYBIT_API_SECRET into $envFile (e.g. with Notepad)."
  if ($scope -eq 'project') {
    Write-Host "  2) Start the agent in this folder ($(Get-Location)): the skill is visible only here."
  } else {
    Write-Host '  2) Restart the agent session: the skill is picked up in any folder.'
  }
}
