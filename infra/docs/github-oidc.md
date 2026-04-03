# GitHub Actions OIDC for `signed-data/signed-data`

Deploy uses [OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) so GitHub can assume an IAM role without long-lived access keys.

## Automated setup (recommended)

From a clone of this repository, with **AWS CLI** credentials (admin or IAM-full) and **GitHub CLI** (`gh`) authenticated:

```bash
./automate-deploy-setup.sh
```

(from the repository root; equivalent to `./infra/scripts/automate-deploy-setup.sh`)

This runs:

1. **`provision-github-oidc-role.sh`** — creates the GitHub OIDC provider (if missing), IAM role **`github-signeddata-org-home`**, trust for `repo:signed-data/signed-data:*`, and attaches `AdministratorAccess` (tighten later if needed).
2. **`sync-github-environment.sh`** — ensures Environment **`production`** exists and sets **`AWS_ACCOUNT_ID`** and **`AWS_DEPLOY_ROLE_ARN`**.

Options:

- `DRY_RUN=1 ./infra/scripts/provision-github-oidc-role.sh` — print AWS steps only (OIDC create still skipped safely when dry).
- `SKIP_GH_SYNC=1 ./infra/scripts/automate-deploy-setup.sh` — AWS only, no `gh`.
- Override role name: `GITHUB_OIDC_ROLE_NAME=my-role ./infra/scripts/provision-github-oidc-role.sh` (then set **`AWS_DEPLOY_ROLE_ARN`** manually in GitHub or adjust the workflow default role name).

The **Deploy site** workflow resolves the role as: `AWS_DEPLOY_ROLE_ARN` if set, otherwise `arn:aws:iam::<AWS_ACCOUNT_ID>:role/github-signeddata-org-home`.

---

## 1. IdP in AWS (once per account)

If `token.actions.githubusercontent.com` is not registered yet:

```bash
aws iam create-open-id-connect-provider \
  --url https://token.actions.githubusercontent.com \
  --client-id-list sts.amazonaws.com \
  --thumbprint-list 6938fd4d98bab03faadb97b34396831e3780aea1
```

Thumbprints can change; see GitHub’s [AWS documentation](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) for the current value.

## 2. Trust policy (IAM role)

Create a role (e.g. `github-signed-data-org-deploy`) with this **trust policy**. Replace `ACCOUNT_ID`.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::ACCOUNT_ID:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com"
        },
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:signed-data/signed-data:*"
        }
      }
    }
  ]
}
```

To allow only the `main` branch and environment-protected jobs, tighten `sub` (examples):

- `repo:signed-data/signed-data:ref:refs/heads/main`
- `repo:signed-data/signed-data:environment:production`

## 3. Permissions for CDK + static deploy

CDK needs CloudFormation, IAM (for custom resources and deployment roles), S3 (assets + site bucket), ACM, Route53, and CloudFront. The exact set depends on your bootstrap stack.

**Practical options:**

1. **Broad (small org / single account):** attach `AdministratorAccess` to the role while iterating; tighten later.
2. **Bootstrap-aligned:** attach the policies created by `cdk bootstrap` for the deploy user/role, plus explicit `s3:*` on the site bucket and `cloudfront:CreateInvalidation` on the distribution ARN.

Minimum areas the role must cover:

- `cloudformation:*` on stack `SignedDataOrgHomeStack` (and CDK asset buckets/prefixes)
- `s3:*` on the marketing bucket `signeddata-org-www-*` and CDK asset staging bucket
- `iam:PassRole` for CDK toolkit roles (`cdk-hnb659fds-*`)
- `acm:*`, `route53:*`, `cloudfront:*` as required for the stack resources

## 4. GitHub configuration

1. Create environment **production** (Settings → Environments), or use **`sync-github-environment.sh`**.
2. Set either:
   - **`AWS_ACCOUNT_ID`** (12-digit account) — workflow assumes role `github-signeddata-org-home`; or
   - **`AWS_DEPLOY_ROLE_ARN`** — full ARN (overrides the default role name).
3. Optional: **`SITE_BUCKET`** and **`CF_DISTRIBUTION_ID`** — if omitted, the workflow reads them from CloudFormation stack outputs after `cdk deploy`.

## 5. Bootstrap CDK (once per account/region)

Stack targets **us-east-1** (CloudFront + ACM). From `infra/`:

```bash
export CDK_DEFAULT_ACCOUNT=YOUR_ACCOUNT_ID
export CDK_DEFAULT_REGION=us-east-1
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
```
