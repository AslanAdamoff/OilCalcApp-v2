/**
 * Template Service — Port of TemplateService.swift
 * Uses localStorage instead of UserDefaults
 */

const STORAGE_KEY = 'oilcalc_trip_templates';

export const TemplateService = {
    loadTemplates() {
        try {
            const data = localStorage.getItem(STORAGE_KEY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('Failed to load templates:', e);
            return [];
        }
    },

    saveTemplate(template) {
        const templates = this.loadTemplates();
        const index = templates.findIndex(t => t.id === template.id);
        if (index >= 0) {
            templates[index] = template;
        } else {
            templates.push(template);
        }
        this._persist(templates);
    },

    deleteTemplate(id) {
        const templates = this.loadTemplates().filter(t => t.id !== id);
        this._persist(templates);
    },

    _persist(templates) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
        } catch (e) {
            console.error('Failed to save templates:', e);
        }
    },
};
