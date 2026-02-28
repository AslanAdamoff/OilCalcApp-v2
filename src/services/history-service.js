/**
 * History Service — Port of HistoryService.swift
 * Uses localStorage instead of JSON file
 */

const STORAGE_KEY = 'oilcalc_history';

export const HistoryService = {
    loadHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load history:', e);
            return [];
        }
    },

    saveHistory(entries) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
        } catch (e) {
            console.error('Failed to save history:', e);
        }
    },

    addEntry(entry) {
        const history = this.loadHistory();
        history.unshift(entry); // Add to beginning
        this.saveHistory(history);
    },

    removeEntry(id) {
        const history = this.loadHistory().filter(e => e.id !== id);
        this.saveHistory(history);
    },

    clearHistory() {
        this.saveHistory([]);
    },
};
