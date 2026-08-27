import { Model } from '@stackbit/types';

export const ApproachSection: Model = {
    type: 'object',
    name: 'ApproachSection',
    label: 'Approach and Qualifications',
    labelField: 'title.text',
    fields: [
        { type: 'model', name: 'badge', label: 'Badge', required: false, models: ['Badge'] },
        { type: 'model', name: 'title', label: 'Title', required: false, models: ['TitleBlock'] },
        { type: 'string', name: 'intro', label: 'Introduction', required: false },
        {
            type: 'list',
            name: 'principles',
            label: 'Working principles',
            required: false,
            items: {
                type: 'object',
                fields: [
                    { type: 'string', name: 'title', label: 'Title', required: true },
                    { type: 'string', name: 'text', label: 'Text', required: true },
                    {
                        type: 'enum',
                        name: 'icon',
                        label: 'Icon',
                        required: false,
                        options: [
                            { label: 'Accountability', value: 'accountability' },
                            { label: 'Oversight', value: 'oversight' },
                            { label: 'Continuity', value: 'continuity' }
                        ]
                    }
                ]
            }
        },
        { type: 'model', name: 'profileImage', label: 'Profile image', required: false, models: ['ImageBlock'] },
        { type: 'string', name: 'profileName', label: 'Name', required: false },
        { type: 'string', name: 'profileLinkedIn', label: 'LinkedIn URL', required: false },
        { type: 'string', name: 'profileBrokerCheck', label: 'FINRA BrokerCheck URL', required: false },
        { type: 'string', name: 'profileRole', label: 'Role', required: false },
        {
            type: 'list',
            name: 'qualifications',
            label: 'FINRA qualifications',
            required: false,
            items: {
                type: 'object',
                fields: [
                    { type: 'string', name: 'series', label: 'Series', required: true },
                    { type: 'string', name: 'title', label: 'Title', required: true },
                    { type: 'string', name: 'subtitle', label: 'Subtitle', required: true }
                ]
            }
        },
        { type: 'string', name: 'elementId', label: 'Element ID', required: false, group: 'settings' },
        {
            type: 'enum',
            name: 'colors',
            label: 'Colors',
            required: false,
            default: 'bg-light-fg-dark',
            options: [
                { label: 'Light background, dark foreground', value: 'bg-light-fg-dark', textColor: '$dark', backgroundColor: '$light' },
                { label: 'Neutral background, dark foreground', value: 'bg-neutral-fg-dark', textColor: '$dark', backgroundColor: '$neutral' }
            ],
            controlType: 'palette',
            group: 'styles'
        },
        {
            type: 'style',
            name: 'styles',
            label: 'Styles',
            required: false,
            styles: { self: { margin: ['tw0:96'], padding: ['tw0:96'] } },
            group: 'styles'
        }
    ],
    fieldGroups: [
        { name: 'styles', label: 'Styles', icon: 'palette' },
        { name: 'settings', label: 'Settings', icon: 'gear' }
    ]
};
