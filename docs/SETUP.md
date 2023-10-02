# Compilation (universal)

1. Install npm by the documentation [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
2. Test that you have npm installed and updated by running `npm --version`.
3. Run `sudo npm i` to install all the packages (this requires `sudo` due to our use of a `package-lock.json`)
   - NOTE: If on windows, instead of sudo, make sure you run from an elevated powershell prompt. Run this command to do get elevated priveleges from your current console: `start-process PowerShell -verb runas` and accept the prompt)
   - If you still run into errors, run `npm install -g npm` to update to latest version of npm (updating requires sudo/elevated prompt as mentioned above)
4. To compile the non-minified output script, run `npm run dev` to generate the `main.js` file from Svelte files (note: `npm run prod` will do the same thing, but create a minified version not ideal for development)

## Linux

1. Create a test obsidian vault (i.e. `obsidian-dev`)
   `mkdir ~/obsidian-dev/`
2. Open the vault folder in obsidian. It will make an `.obsidian` hidden folder.
3. Disable "Safe mode" from Settings > Community Plugins
4. Create a symlink to your cloned & build project (see above)

```bash
ln -s ~/repos/obsidian-checklist-plugin/ ~/obsidian-dev-vault/.obsidian/plugins/obsidian-checklist-plugin
```

5. Make changes & compile the repository, then make sure to reload the changes in Obsidian from Community Plugins > Installed plugins. (Note: this may require restarting obsidian at times, possibly due to caching, if the refresh doesn't work)

## Windows

1. Manually copy the compiled `main.js` into your development vault's folder this plugin, i.e. `.obsidian\plugins\obsidian-checklist-plugin`, with a different folder name if you prefer.

# Troubleshooting
