export const GQL = "https://api.linear.app/graphql";

export const ISSUE_FIELDS = `
  id identifier title description url priority priorityLabel
  createdAt updatedAt
  state { id name type }
  assignee { id name displayName }
  team { id key name }
  parent { id identifier title }
  labels { nodes { id name } }
  relations { nodes { type relatedIssue { identifier title state { name type } } } }
`;

export const FETCH_ISSUE = `
  query($filter: IssueFilter) {
    issues(filter: $filter, first: 1) { nodes { ${ISSUE_FIELDS} } }
  }
`;

export const LIST_ISSUES = `
  query($filter: IssueFilter, $first: Int) {
    issues(filter: $filter, first: $first) {
      nodes { ${ISSUE_FIELDS} }
    }
  }
`;

export const CREATE_ISSUE = `
  mutation($input: IssueCreateInput!) {
    issueCreate(input: $input) {
      success
      issue { ${ISSUE_FIELDS} }
    }
  }
`;

export const UPDATE_ISSUE = `
  mutation($id: String!, $input: IssueUpdateInput!) {
    issueUpdate(id: $id, input: $input) {
      success
      issue { ${ISSUE_FIELDS} }
    }
  }
`;

export const LIST_MY_PROJECTS = `
  query($first: Int) {
    projects(filter: { members: { isMe: { eq: true } } }, first: $first) {
      nodes { id name state }
    }
  }
`;

export const RESOLVE_TEAM = `
  query($filter: TeamFilter) {
    teams(filter: $filter, first: 1) { nodes { id key name } }
  }
`;

export const RESOLVE_STATES = `
  query($filter: WorkflowStateFilter) {
    workflowStates(filter: $filter) {
      nodes { id name type }
    }
  }
`;
