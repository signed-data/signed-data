#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import { HomeSiteStack } from "../lib/home-site-stack.js";

const app = new cdk.App();

new HomeSiteStack(app, "SignedDataOrgHomeStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION ?? "us-east-1",
  },
  tags: {
    Project: "signeddata-org-home",
    ManagedBy: "cdk",
  },
});
