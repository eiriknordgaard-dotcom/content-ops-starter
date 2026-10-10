const ALERT_TITLE = '[Production monitor] Website check failed';

async function findOpenAlert(github, owner, repo) {
    const response = await github.rest.issues.listForRepo({
        owner,
        repo,
        state: 'open',
        per_page: 100
    });

    return response.data.find((issue) => !issue.pull_request && issue.title === ALERT_TITLE);
}

async function handleMonitorAlert({ github, context, outcome, runUrl }) {
    const { owner, repo } = context.repo;
    const existingAlert = await findOpenAlert(github, owner, repo);

    if (outcome === 'failure') {
        const failureBody = [
            'The automated production smoke monitor failed.',
            '',
            `Workflow run: ${runUrl}`,
            '',
            `Response owner: @${owner}`,
            '',
            'Review the failed step, confirm whether the website is affected, and record the resolution.'
        ].join('\n');

        if (existingAlert) {
            await github.rest.issues.createComment({
                owner,
                repo,
                issue_number: existingAlert.number,
                body: failureBody
            });
            return { action: 'updated', issueNumber: existingAlert.number };
        }

        const createdAlert = await github.rest.issues.create({
            owner,
            repo,
            title: ALERT_TITLE,
            body: failureBody,
            assignees: [owner]
        });
        return { action: 'opened', issueNumber: createdAlert.data.number };
    }

    if (outcome === 'success' && existingAlert) {
        await github.rest.issues.createComment({
            owner,
            repo,
            issue_number: existingAlert.number,
            body: `The production smoke monitor recovered successfully.\n\nWorkflow run: ${runUrl}`
        });
        await github.rest.issues.update({
            owner,
            repo,
            issue_number: existingAlert.number,
            state: 'closed',
            state_reason: 'completed'
        });
        return { action: 'closed', issueNumber: existingAlert.number };
    }

    return { action: 'none' };
}

module.exports = { ALERT_TITLE, handleMonitorAlert };
