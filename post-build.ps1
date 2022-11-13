$vault="$env:USERPROFILE\projs\obsidian-dev\test-vault" # replace with w/e
Copy-Item .\main.js "$vault\.obsidian\plugins\obsidian-checklist-plugin"
Copy-Item .\styles.css "$vault\.obsidian\plugins\obsidian-checklist-plugin"