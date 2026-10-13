#!/bin/sh
rm -rf ~/.config/appfinder ~/.cache/appfinder \
       ~/Library/Application\ Support/AppFinder \
       ~/Library/Caches/org.yanbab.appfinder \
       ~/Library/Saved\ Application\ State/org.yanbab.appfinder.savedState \
       ~/Library/HTTPStorages/org.yanbab.appfinder \
       ~/Library/Logs/AppFinder \
       ~/Library/Preferences/org.yanbab.appfinder.plist && \
defaults delete org.yanbab.appfinder 2>/dev/null || true
