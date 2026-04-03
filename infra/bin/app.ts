#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { HomeSiteStack } from "../lib/home-site-stack.js";

const app = new cdk.App();

// CloudFront viewer certificate must use ACM in us-east-1; do not follow CDK_DEFAULT_REGION.
new HomeSiteStack(app, "SignedDataOrgHomeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: "us-east-1",
  },
  tags: {
    Project: "signeddata-org-home",
    ManagedBy: "cdk",
  },
});
