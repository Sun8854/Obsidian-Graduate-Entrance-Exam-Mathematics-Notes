/*
![](https://raw.githubusercontent.com/zsviczian/obsidian-excalidraw-plugin/master/images/scripts-color-change.jpg)

This script toggles the stroke color between Red and Black. 
If elements are selected, it updates their color.
If no elements are selected, it updates the current pen color (globally).

Assign a shortcut to this script in the Excalidraw Plugin settings to use it quickly.

```javascript
*/
const RED = "#ff0000";
const BLACK = "#000000";

// Helper function to detect if the color is "Red" (handles standard red and Excalidraw red)
const isRed = (color) => {
    if (!color) return false;
    const c = color.toLowerCase();
    return c === "#ff0000" || c === "#e03131" || c === "red";
};

const elements = ea.getViewSelectedElements();
let targetColor = RED;

if (elements.length > 0) {
    // There are selected elements
    // Check the color of the first element to decide the toggle direction
    const firstElementColor = elements[0].strokeColor;
    
    if (isRed(firstElementColor)) {
        targetColor = BLACK;
    } else {
        targetColor = RED;
    }
    
    // Update the selected elements
    ea.copyViewElementsToEAforEditing(elements);
    ea.getElements().forEach((el) => {
        el.strokeColor = targetColor;
    });
    ea.addElementsToView(false, false);
} else {
    // No elements selected, toggle the global pen color
    const api = ea.getExcalidrawAPI();
    const appState = api.getAppState();
    const currentColor = appState.currentItemStrokeColor;

    if (isRed(currentColor)) {
        targetColor = BLACK;
    } else {
        targetColor = RED;
    }
}

// Update the global state so the next drawn item uses the new color
ea.viewUpdateScene({ appState: { currentItemStrokeColor: targetColor } });
