function ConvertTo-MeridianApiKey {
    param([string]$Value)
    # Remove paste-only whitespace and invisible formatting; never change key letters.
    $clean = [regex]::Replace($Value, '\p{Cf}', '').Trim()
    if ($clean.Length -ge 2 -and (($clean.StartsWith('"') -and $clean.EndsWith('"')) -or ($clean.StartsWith("'") -and $clean.EndsWith("'")))) {
        $clean = $clean.Substring(1, $clean.Length - 2)
    }
    if ($clean -match '[\p{Cc}]') {
        throw 'AI_PASTE_CONTROL: The terminal received a keyboard control character. Cancel with Ctrl+C, rerun, then paste using right-click or Shift+Insert instead of Ctrl+V.'
    }
    if ($clean -notmatch '^sk-[A-Za-z0-9_-]+$') {
        throw 'AI_KEY_FORMAT: Input is not a plain OpenAI API key. Copy only the key using its Copy button; paste once using right-click or Shift+Insert. Do not include commands or explanatory words.'
    }
    if ($clean -cne $Value) { Write-Host 'Removed whitespace/invisible formatting around the pasted key.' }
    return $clean
}
