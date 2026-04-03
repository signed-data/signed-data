# GitHub Actions OIDC for `signed-data/signed-data`

Deploy uses [OpenID Connect](https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services) so GitHub can assume an IAM role without long-lived access keys.

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

1. Create environment **production** (Settings → Environments).
2. Add variable **`AWS_DEPLOY_ROLE_ARN`**: `arn:aws:iam::ACCOUNT_ID:role/github-signed-data-org-deploy`.
3. Optional: **`SITE_BUCKET`** and **`CF_DISTRIBUTION_ID`** — if omitted, the workflow reads them from CloudFormation stack outputs after `cdk deploy`.

## 5. Bootstrap CDK (once per account/region)

Stack targets **us-east-1** (CloudFront + ACM). From `infra/`:

```bash
export CDK_DEFAULT_ACCOUNT=YOUR_ACCOUNT_ID
export CDK_DEFAULT_REGION=us-east-1
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/us-east-1
```
