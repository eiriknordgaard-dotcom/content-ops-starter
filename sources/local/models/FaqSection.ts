import { Model } from '@stackbit/types';

export const FaqSection: Model = {
    type: 'object',
    name: 'FaqSection',
    label: 'FAQ',
    labelField: 'title.text',
    fields: [
        {
            type: 'model',
            name: 'title',
            label: 'Title',
            required: true,
            models: ['TitleBlock']
        },
        {
            type: 'string',
            name: 'description',
            label: 'Description',
            required: false
        },
        {
            type: 'list',
            name: 'items',
            label: 'Questions',
            required: true,
            items: {
                type: 'object',
                fields: [
                    {
                        type: 'string',
                        name: 'question',
                        label: 'Question',
                        required: true
                    },
                    {
                        type: 'markdown',
                        name: 'answer',
                        label: 'Answer',
                        required: true
                    }
                ]
            }
        },
        {
            type: 'model',
            name: 'badge',
            label: 'Badge',
            required: false,
            models: ['Badge']
        },
        {
            type: 'string',
            name: 'elementId',
            label: 'Element ID',
            required: false,
            group: 'settings'
        },
        {
            type: 'enum',
            name: 'colors',
            label: 'Colors',
            required: false,
            default: 'bg-light-fg-dark',
            options: [
                { label: 'Light background, dark foreground', value: 'bg-light-fg-dark' },
                { label: 'Neutral background, dark foreground', value: 'bg-neutral-fg-dark' },
                { label: 'Dark background, light foreground', value: 'bg-dark-fg-light' }
            ],
            group: 'styles'
        },
        {
            type: 'style',
            name: 'styles',
            label: 'Styles',
            required: false,
            styles: {
                self: {
                    margin: ['tw0:96'],
                    padding: ['tw0:96']
                }
            }
        }
    ],
    fieldGroups: [
        { name: 'styles', label: 'Styles', icon: 'palette' },
        { name: 'settings', label: 'Settings', icon: 'gear' }
    ]
};
