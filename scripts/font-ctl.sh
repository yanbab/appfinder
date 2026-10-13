#!/usr/bin/env bash
# font-ctl.sh - Activate, deactivate, and check status of fonts via macOS CoreText Swift APIs
set -euo pipefail

ACTION="${1:-}"
FONT_PATH="${2:-}"

if [[ -z "$ACTION" || -z "$FONT_PATH" ]]; then
  echo "Usage: $0 {status|activate|deactivate} <path-to-font-file>"
  echo "Examples:"
  echo "  $0 status ~/Library/Fonts/FiraCode-Regular.otf"
  echo "  $0 activate ~/Library/Fonts/FiraCode-Regular.otf"
  echo "  $0 deactivate ~/Library/Fonts/FiraCode-Regular.otf"
  exit 1
fi

# Resolve absolute path and expand ~
RESOLVED_PATH=$(python3 -c "import os, sys; print(os.path.realpath(os.path.expanduser(sys.argv[1])))" "$FONT_PATH")

if [[ ! -f "$RESOLVED_PATH" ]]; then
  echo "Error: Font file not found at: $RESOLVED_PATH"
  exit 1
fi

case "$ACTION" in
  activate)
    echo "Activating font: $RESOLVED_PATH ..."
    swift -e '
    import CoreText
    import Foundation

    let path = CommandLine.arguments[1]
    let url = URL(fileURLWithPath: path) as CFURL
    var error: Unmanaged<CFError>?
    let success = CTFontManagerRegisterFontsForURL(url, .user, &error)
    if success {
        print("SUCCESS: Font registered and activated in user scope.")
    } else {
        let errDesc = error?.takeRetainedValue().localizedDescription ?? "Registration failed or already active"
        print("RESULT: \(errDesc)")
    }
    ' "$RESOLVED_PATH"
    ;;

  deactivate)
    echo "Deactivating font: $RESOLVED_PATH ..."
    swift -e '
    import CoreText
    import Foundation

    let path = CommandLine.arguments[1]
    let url = URL(fileURLWithPath: path) as CFURL
    var error: Unmanaged<CFError>?
    let success = CTFontManagerUnregisterFontsForURL(url, .user, &error)
    if success {
        print("SUCCESS: Font unregistered and deactivated in user scope.")
    } else {
        let errDesc = error?.takeRetainedValue().localizedDescription ?? "Unregistration failed or not active"
        print("RESULT: \(errDesc)")
    }
    ' "$RESOLVED_PATH"
    ;;

  status)
    echo "Checking status for: $RESOLVED_PATH ..."
    swift -e '
    import CoreText
    import Foundation

    let path = CommandLine.arguments[1]
    let url = URL(fileURLWithPath: path) as CFURL

    guard let descriptors = CTFontManagerCreateFontDescriptorsFromURL(url) as? [CTFontDescriptor], !descriptors.isEmpty else {
        print("STATUS: Invalid or unreadable font file: \(path)")
        exit(1)
    }

    print("Found \(descriptors.count) font face(s) in container:")
    for (idx, desc) in descriptors.enumerated() {
        let name = CTFontDescriptorCopyAttribute(desc, kCTFontDisplayNameAttribute) as? String 
            ?? CTFontDescriptorCopyAttribute(desc, kCTFontNameAttribute) as? String 
            ?? "Unknown"
        let family = CTFontDescriptorCopyAttribute(desc, kCTFontFamilyNameAttribute) as? String ?? "Unknown"
        let style = CTFontDescriptorCopyAttribute(desc, kCTFontStyleNameAttribute) as? String ?? "Regular"
        let enabled = CTFontDescriptorCopyAttribute(desc, kCTFontEnabledAttribute) as? Bool ?? true
        
        print(" [\(idx + 1)] \(name)")
        print("     Family : \(family)")
        print("     Style  : \(style)")
        print("     Status : \(enabled ? "Active / Enabled" : "Disabled")")
    }
    ' "$RESOLVED_PATH"
    ;;

  *)
    echo "Error: Unknown action \"$ACTION\". Supported actions: activate, deactivate, status"
    exit 1
    ;;
esac
