export interface fileRules {
    spacing: Record<string, number>;
    required_headings_regex: Record<string, RegExp>;
}

export const vitalFilesRules: Record<string, fileRules> = {
    'Outlines.md': {
        spacing: {
            "level1": 10,
            "level2": 2
        },
        required_headings_regex: {}
    },
    'Premises.md': {
        spacing: {
            "level1": 50,
            "level2": 10,
            "level3": 2
        },
        required_headings_regex: {}
    },
    'Questions.md': {
        spacing: {
            "level1": 10,
            "level2": 2
        },
        required_headings_regex: {
            "level1": /^#\s+Question\s+(\d+)/gm
        }
    }
};
