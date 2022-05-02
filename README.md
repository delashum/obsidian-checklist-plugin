==LOOKING FOR ANOTHER MAINTAINER TO HELP OUT== There's quite a bit of work to do on this plugin still and i've been neglecting it because work is too busy. I would love some help, or at least someone who could approve PRs and triage issues. Send me an email at delashum@gmail.com if you're interested.


# obsidian-checklist-plugin

This plugin conslidates checklists from across files into a single view.

![screenshot-main](https://raw.githubusercontent.com/delashum/obsidian-checklist-plugin/master/images/screenshot-two-files.png)

## Usage

After enabling this plugin, you will see the checklist appear in the right sidebar.

Any block of checklist items you tag with `#todo` will appear in this sidebar.

You can complete checklist items by checking them off in your editor (e.g. `- [ ]` -> `- [x]`) or by clicking a checklist item in the sidebar which will update your `.md` file for you

## Configuration

![screenshot-settings](https://raw.githubusercontent.com/delashum/obsidian-checklist-plugin/master/images/screenshot-settings.png)

**Tag name:** The default tag to lookup checklist items by is `#todo`, but may be changed to whatever you like

**Show completed?:** By default the plugin will only show uncompleted tasks, and as tasks are completed they will filter out of the sidebar. You may choose to show all tasks

![screenshot-completed](https://raw.githubusercontent.com/delashum/obsidian-checklist-plugin/master/images/screenshot-show-completed.png)

**Group by:** You can group by either file or tagname. If you choose to group by tag name they will appear in the order that they first appear in your files (or last depending on sort order)

![screenshot-tags](https://raw.githubusercontent.com/delashum/obsidian-checklist-plugin/master/images/screenshot-sub-tag.png)

**Sort order:** By default checklist items will appear in the order they appear in the file, with files ordered with the oldest at the top. This can be changed to show the newest files at the top.
