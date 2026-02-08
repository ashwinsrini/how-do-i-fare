import { sequelize } from '../index.js';
import defineUser from './User.js';
import defineOtpCode from './OtpCode.js';
import defineJiraCredential from './JiraCredential.js';
import defineGithubCredential from './GithubCredential.js';
import defineJiraInstance from './JiraInstance.js';
import defineJiraProject from './JiraProject.js';
import defineJiraSprint from './JiraSprint.js';
import defineJiraIssue from './JiraIssue.js';
import defineGithubOrganization from './GithubOrganization.js';
import defineGithubOrgMember from './GithubOrgMember.js';
import defineGithubRepository from './GithubRepository.js';
import defineGithubPullRequest from './GithubPullRequest.js';
import defineGithubReview from './GithubReview.js';
import defineCredentialGithubOrg from './CredentialGithubOrg.js';
import defineCredentialJiraProject from './CredentialJiraProject.js';
import defineSyncJob from './SyncJob.js';
import defineAppSetting from './AppSetting.js';
import defineTeamMember from './TeamMember.js';

const User = defineUser(sequelize);
const OtpCode = defineOtpCode(sequelize);
const JiraCredential = defineJiraCredential(sequelize);
const GithubCredential = defineGithubCredential(sequelize);
const JiraInstance = defineJiraInstance(sequelize);
const JiraProject = defineJiraProject(sequelize);
const JiraSprint = defineJiraSprint(sequelize);
const JiraIssue = defineJiraIssue(sequelize);
const GithubOrganization = defineGithubOrganization(sequelize);
const GithubOrgMember = defineGithubOrgMember(sequelize);
const GithubRepository = defineGithubRepository(sequelize);
const GithubPullRequest = defineGithubPullRequest(sequelize);
const GithubReview = defineGithubReview(sequelize);
const CredentialGithubOrg = defineCredentialGithubOrg(sequelize);
const CredentialJiraProject = defineCredentialJiraProject(sequelize);
const SyncJob = defineSyncJob(sequelize);
const AppSetting = defineAppSetting(sequelize);
const TeamMember = defineTeamMember(sequelize);

// --- User Associations ---
User.hasMany(JiraCredential, { foreignKey: 'userId', as: 'jiraCredentials', onDelete: 'CASCADE' });
JiraCredential.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(GithubCredential, { foreignKey: 'userId', as: 'githubCredentials', onDelete: 'CASCADE' });
GithubCredential.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// --- Jira Associations ---
JiraInstance.hasMany(JiraProject, { foreignKey: 'instanceId', as: 'projects', onDelete: 'CASCADE' });
JiraProject.belongsTo(JiraInstance, { foreignKey: 'instanceId', as: 'instance' });

JiraProject.hasMany(JiraSprint, { foreignKey: 'projectId', as: 'sprints', onDelete: 'CASCADE' });
JiraSprint.belongsTo(JiraProject, { foreignKey: 'projectId', as: 'project' });

JiraProject.hasMany(JiraIssue, { foreignKey: 'projectId', as: 'issues', onDelete: 'CASCADE' });
JiraIssue.belongsTo(JiraProject, { foreignKey: 'projectId', as: 'project' });

JiraSprint.hasMany(JiraIssue, { foreignKey: 'sprintId', as: 'issues' });
JiraIssue.belongsTo(JiraSprint, { foreignKey: 'sprintId', as: 'sprint' });

// --- Jira Junction ---
JiraCredential.belongsToMany(JiraProject, {
  through: CredentialJiraProject,
  foreignKey: 'credentialId',
  otherKey: 'projectId',
  as: 'linkedProjects',
});
JiraProject.belongsToMany(JiraCredential, {
  through: CredentialJiraProject,
  foreignKey: 'projectId',
  otherKey: 'credentialId',
  as: 'linkedCredentials',
});

// --- GitHub Associations ---
GithubOrganization.hasMany(GithubOrgMember, { foreignKey: 'organizationId', as: 'members', onDelete: 'CASCADE' });
GithubOrgMember.belongsTo(GithubOrganization, { foreignKey: 'organizationId', as: 'organization' });

GithubOrganization.hasMany(GithubRepository, { foreignKey: 'organizationId', as: 'repositories', onDelete: 'CASCADE' });
GithubRepository.belongsTo(GithubOrganization, { foreignKey: 'organizationId', as: 'organization' });

GithubRepository.hasMany(GithubPullRequest, { foreignKey: 'repositoryId', as: 'pullRequests', onDelete: 'CASCADE' });
GithubPullRequest.belongsTo(GithubRepository, { foreignKey: 'repositoryId', as: 'repository' });

GithubPullRequest.hasMany(GithubReview, { foreignKey: 'pullRequestId', as: 'reviews', onDelete: 'CASCADE' });
GithubReview.belongsTo(GithubPullRequest, { foreignKey: 'pullRequestId', as: 'pullRequest' });

// --- GitHub Junction ---
GithubCredential.belongsToMany(GithubOrganization, {
  through: CredentialGithubOrg,
  foreignKey: 'credentialId',
  otherKey: 'organizationId',
  as: 'linkedOrganizations',
});
GithubOrganization.belongsToMany(GithubCredential, {
  through: CredentialGithubOrg,
  foreignKey: 'organizationId',
  otherKey: 'credentialId',
  as: 'linkedCredentials',
});

// --- Sync Associations ---
JiraCredential.hasMany(SyncJob, { foreignKey: 'jiraCredentialId', as: 'syncJobs' });
SyncJob.belongsTo(JiraCredential, { foreignKey: 'jiraCredentialId', as: 'jiraCredential' });

GithubCredential.hasMany(SyncJob, { foreignKey: 'githubCredentialId', as: 'syncJobs' });
SyncJob.belongsTo(GithubCredential, { foreignKey: 'githubCredentialId', as: 'githubCredential' });

export {
  sequelize,
  User,
  OtpCode,
  JiraCredential,
  GithubCredential,
  JiraInstance,
  JiraProject,
  JiraSprint,
  JiraIssue,
  GithubOrganization,
  GithubOrgMember,
  GithubRepository,
  GithubPullRequest,
  GithubReview,
  CredentialGithubOrg,
  CredentialJiraProject,
  SyncJob,
  AppSetting,
  TeamMember,
};
