javascript:(function() {
    const currentUrl = window.location.href;
    const targetUrl = 'https://new.justin-c.com/email-to-ics/?display=email';
    const credentials = btoa('calendar:justinc');

    // --- IDs ---
    const dialogId = 'bookmarklet-instructions-dialog';
    const alertId = 'bookmarklet-alert';
    const spinnerId = 'bookmarklet-spinner';
    const dialogContentId = 'bookmarklet-dialog-content';
    const instructionsId = 'bookmarklet-instructions';

    // --- State ---
    let isFetching = false;
    let dialogRef = null; // Reference to the dialog element
    let styleRef = null; // Reference to the style element
    let alertContainerRef = null; // Reference to the fallback alert container

    // --- Cleanup existing elements ---
    document.getElementById(dialogId)?.remove();
    document.getElementById(alertId)?.remove();
    // Assuming previous styles might have a specific ID or class if needed, but removing by ref is safer

    // --- Create Dialog ---
    dialogRef = document.createElement('dialog');
    dialogRef.id = dialogId;
    dialogRef.innerHTML = `
        <div id="${dialogContentId}">
            <form method="dialog" id="bookmarklet-form">
                <p>
                    <label for="${instructionsId}">Special Instructions (optional):</label>
                </p>
                <p>
                    <textarea id="${instructionsId}" name="instructions" style="width: 95%; min-height: 60px;"></textarea>
                </p>
                <menu style="text-align: right;">
                    <button value="cancel" formmethod="dialog">Cancel</button>
                    <button id="bookmarklet-submit" value="submit">Submit</button>
                </menu>
            </form>
        </div>
    `;
    document.body.appendChild(dialogRef);

    // --- Styling (Only add once) ---
    styleRef = document.createElement('style');
    styleRef.type = 'text/css';
    styleRef.innerHTML = `
        #${dialogId} {
            padding: 20px;
            border: 1px solid #ccc;
            border-radius: 8px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
            min-width: 300px;
            max-width: 500px;
            min-height: 150px; /* Ensure space for status */
        }
        #${dialogId}::backdrop {
            background-color: rgba(0, 0, 0, 0.5);
        }
        /* Fallback Alert Styles */
        #${alertId} {
            position: fixed;
            top: 20px;
            right: 20px;
            width: 300px;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 8px 16px rgba(0,0,0,0.2);
            z-index: 9999;
            font-size: 16px;
            text-align: center;
            display: none; /* Initially hidden */
            background-color: #fff3cd; /* Default background */
            color: #856404; /* Default color */
        }
         #${alertId} button.close-btn {
            position: absolute;
            top: 10px;
            right: 10px;
            border: none;
            background: transparent;
            font-size: 20px;
            line-height: 20px;
            cursor: pointer;
        }
         /* Spinner Styles (used in both dialog and alert) */
        #${spinnerId} {
            margin-left: 10px;
            display: inline-block;
            border: 3px solid #f3f3f3;
            border-top: 3px solid #856404; /* Spinner color for generating */
            border-radius: 50%;
            width: 20px;
            height: 20px;
            animation: spin 1s linear infinite;
            vertical-align: middle;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        /* Status message styling inside dialog */
        #${dialogContentId} strong {
             display: block;
             margin-bottom: 10px;
        }
        #${dialogContentId} iframe {
             width:100%; height:100px; border:none; margin-top:10px;
        }
        #${dialogContentId} menu button {
             margin-top: 15px;
        }
    `;
    document.head.appendChild(styleRef);

    // --- Fallback Alert Container Setup (created but hidden) ---
    alertContainerRef = document.createElement('div');
    alertContainerRef.id = alertId;
    document.body.appendChild(alertContainerRef);

    // --- Dialog Event Listeners ---

    // Handle Submit Button Click
    dialogRef.querySelector('#bookmarklet-submit').addEventListener('click', (event) => {
        event.preventDefault(); // Stop default form submission
        const instructions = dialogRef.querySelector(`#${instructionsId}`).value;
        isFetching = true;
        showDialogContent(`<strong>Generating ICS...</strong><span id="${spinnerId}"></span>`);
        sendRequest(instructions);
    });

    // Handle Dialog Close Event (ESC, Cancel button, or programmatic close)
    dialogRef.addEventListener('close', function() {
        // If fetch is not running OR if it just finished, clean up fully.
        // The `isFetching` check prevents cleanup if closed *during* fetch.
        if (!isFetching) {
             cleanup();
        }
        // If closed WHILE fetching (e.g., ESC), isFetching remains true.
        // The fetch completion handler will use the fallback alert.
    });

    // --- Helper Functions ---

    function showDialogContent(contentHtml) {
        if (dialogRef && dialogRef.open) {
             const contentDiv = dialogRef.querySelector(`#${dialogContentId}`);
             if (contentDiv) {
                 contentDiv.innerHTML = contentHtml;
             }
        }
    }

    function showDialogResult(contentHtml) {
         showDialogContent(contentHtml + 
             `<menu style="text-align: right;"><button onclick="document.getElementById('${dialogId}')?.close()">Close</button></menu>`
         );
    }

    function showFallbackAlert(bgColor, color, contentHtml) {
        if (alertContainerRef) {
            alertContainerRef.style.backgroundColor = bgColor;
            alertContainerRef.style.color = color;
            alertContainerRef.innerHTML = contentHtml + 
                `<button class="close-btn" onclick="this.parentElement.remove()">×</button>`;
            alertContainerRef.style.display = 'block';
        }
         cleanup(); // Clean up dialog/styles after showing fallback
    }

    function showSuccess() {
        const successHtml = `<strong>ICS sent to email</strong>`;
        if (dialogRef && dialogRef.open) {
            showDialogResult(successHtml);
        } else {
            showFallbackAlert('#d4edda', '#155724', successHtml);
        }
        isFetching = false;
    }

    function showError(errorMessage) {
        const escapedErrorMessage = errorMessage.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const errorHtml = `<strong>Error</strong><iframe srcdoc="${escapedErrorMessage}"></iframe>`;
        if (dialogRef && dialogRef.open) {
            showDialogResult(errorHtml);
        } else {
            showFallbackAlert('#f8d7da', '#721c24', errorHtml);
        }
        isFetching = false;
    }

    function cleanup() {
        dialogRef?.remove();
        styleRef?.remove();
        alertContainerRef?.remove(); // Remove fallback if unused or used
        dialogRef = null;
        styleRef = null;
        alertContainerRef = null;
    }

    // --- Fetch Logic ---
    function sendRequest(specialInstructions) {
        fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Basic ' + credentials
                },
                body: new URLSearchParams({
                    url: currentUrl,
                    html: document.documentElement.outerHTML,
                    instructions: specialInstructions || ''
                })
            })
            .then(response => {
                if (!response.ok) {
                    // Throw response to be caught, try to read text
                    return response.text().then(text => { throw new Error(text); });
                }
                // Don't return response body if not needed
                return null;
            })
            .then(() => {
                 showSuccess();
            })
            .catch(error => {
                 // error.message might contain the response text from the chained .then
                 const message = error?.message || 'Could not retrieve error details.';
                 showError(message);
            });
    }

    // --- Initial Action --- Show the dialog
    dialogRef.showModal();

})();