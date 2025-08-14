EARS patterns definitions
    Generic
        While <optional_pre-condition>, when <trigger>, the <system_name> shall <system_response>
    Ubiquitous
        The <system_name> shall <system_response>
    State driven
        While <precondition(s)>, the <system_name> shall <system_response>
    Event driven
        When <trigger>, the <system_name> shall <system_response>
    Optional feature
        Where <feature_is_included>, the <system_name> shall <system_response>
    Unwanted behavior
        If <trigger>, the <system_name> shall <system_response>
    Complex
        While <precondition(s)>, when <trigger>, the <system_name> shall <system_response>

vscode-outnav
    Mental models
        AI agent
            npm dependencies and initialization
                The Extension shall be initialized using "npm install --global yo generator-code; yo code; npm install katex"
            Systems
                Commands
                    vscode-outnav.startOutlineNavigator
                        When the command vscode-outnav.startOutlineNavigator is executed, the Extension shall parse outnav-workspace/Outlines.md to outnav-workspace/json_exports/outlines.json according to outnav-workspace/json_exports/outlines_schema.json
                        When the outnav-workspace/Outlines.md has been sucessfully parsed, the Extension shall open the Outline Webview
                Webviews
                    For any Webview
                        Image rendering
                             The Extension shall render any images referenced in a heading using standard Markdown syntax (![alt](src)), resolving the image path relative to the active workspace root.
                    For Outline Webview
                        EARS
                            When the Outline Webview is opened, the Extension shall read the content of outnav-workspace/json_exports/outlines.json
                            While the Outline Webview is active, the Extension shall display each title from the current navigation level sequentially, replacing the displayed title every 2 seconds..
                        Keyboard shortcuts
                            While the Outline Webview is opened, when the `Space` key is pressed, the Outline Webview shall pause/play the title replacing
                            While the Outline Webview is opened, when the `Esc` key is pressed, the Outline Webview shall close
                            While the Outline Webview is opened, when the `=`/`-` keys are pressed, the title replacing frequency shall decrease/increase
                            While the Outline Webview is opened, when the `A`/`D` keys are pressed, the title level shall decrease/increase

