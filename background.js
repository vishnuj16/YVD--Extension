// Background script for YouTube Downloader

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'download') {
        handleDownload(request.url, request.filename);
    }
});

async function handleDownload(url, filename) {
    try {
        // Use Chrome's downloads API to download the file
        await chrome.downloads.download({
            url: url,
            filename: filename,
            saveAs: false // Set to true if you want to prompt user for location
        });
        
        console.log(`Download initiated: ${filename}`);
    } catch (error) {
        console.error('Download failed:', error);
        
        // Fallback: try to open the URL in a new tab
        try {
            await chrome.tabs.create({ url: url });
        } catch (tabError) {
            console.error('Fallback failed:', tabError);
        }
    }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
    console.log('YouTube Downloader extension installed');
});

// Handle tab updates to detect YouTube pages
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.url && tab.url.includes('youtube.com/watch')) {
        // Enable the extension icon for YouTube pages
        chrome.action.enable(tabId);
    }
});

// Handle navigation to update extension availability
chrome.tabs.onActivated.addListener(async (activeInfo) => {
    try {
        const tab = await chrome.tabs.get(activeInfo.tabId);
        if (tab.url && tab.url.includes('youtube.com/watch')) {
            chrome.action.enable(activeInfo.tabId);
        } else {
            chrome.action.disable(activeInfo.tabId);
        }
    } catch (error) {
        // Tab might be loading or inaccessible
        chrome.action.disable(activeInfo.tabId);
    }
});