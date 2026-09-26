please remove following features. The code need to be smaller and simpler.
- Infopanel > 'Provides'
- Progress bar on dock icon
- Spinner on buttons. Only "<Action name>..." if action in progress

Enhance statusbar with following features:

- status bar : default state (Checkmark icon + " X updates available" + "last checked ..."). Shows "Up to date" instead of a number when no updates are available.
- Status bar : Show messages from output begining with "==> " 

New Feat :

- Info panel > Download size (see how CaskHub does it, it sends special headers to get size and fallback to download only 1 byte or something) cf Two-Step Download Size Resolution   bellow
- Info panel > Installed size
- Info panel > Data size (calculated with the 'zap' stanzas)
- Settings > Show updates count in tray (template version of icon.svg + number) 
- Settings > Show updates count in dock badge
- Settings > Auto check for updates



Refactor :

Can you provide a plan to refactor the code to be smaller, simpler and more modular?
Mostly the Renderer and ipc/ side of things has got quite complicated.
please refactor the code to make it smaller and more modular where ever possible.


### Two-Step Download Size Resolution                                        
          
To find the size without downloading the installer/DMG/ZIP, CaskHub uses a two-tier HTTP        
strategy:                                                                                       
1. HTTP HEAD Request:                                                                           
    • Sends a HEAD request to cask.url (with a 15s timeout).                                    
    • If the server returns a valid Content-Length header (response.expectedContentLength > 0), 
    that value is used immediately.                                                             
2. HTTP Range: bytes=0-0 Fallback:                                                              
    • Many download hosts and CDNs (e.g., GitHub releases, SourceForge) redirect, block HEAD    
    requests, or omit Content-Length on HEAD.                                                   
    • If HEAD doesn't yield a size, CaskHub issues a GET request asking for just the first byte:
    Range: bytes=0-0
    • If the server supports byte ranges (HTTP 206 Partial Content), it responds with the       
    Content-Range header:                                                                       
    Content-Range: bytes 0-0/52428800        
    • CaskHub parses the total size after the slash (/52428800 → 52.4 MB) while downloading only1 byte of payload.                                                                          
                            