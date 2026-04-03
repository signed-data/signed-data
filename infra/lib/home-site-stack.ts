import * as cdk from "aws-cdk-lib";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as route53targets from "aws-cdk-lib/aws-route53-targets";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import { Construct } from "constructs";

const PRIMARY_DOMAIN = "signed-data.org";
const ALT_DOMAIN = "signeddata.org";

/**
 * Static marketing site: private S3, CloudFront OAC, ACM, Route53.
 * Bucket name avoids collision with signed-data/cds stack (`signeddata-site-*`).
 */
export class HomeSiteStack extends cdk.Stack {
  public readonly siteBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const primaryZone = route53.HostedZone.fromLookup(this, "PrimaryZone", {
      domainName: PRIMARY_DOMAIN,
    });

    const altZone = route53.HostedZone.fromLookup(this, "AltZone", {
      domainName: ALT_DOMAIN,
    });

    const certificate = new acm.Certificate(this, "SiteCert", {
      domainName: PRIMARY_DOMAIN,
      subjectAlternativeNames: [
        `www.${PRIMARY_DOMAIN}`,
        ALT_DOMAIN,
        `www.${ALT_DOMAIN}`,
      ],
      validation: acm.CertificateValidation.fromDnsMultiZone({
        [PRIMARY_DOMAIN]: primaryZone,
        [`www.${PRIMARY_DOMAIN}`]: primaryZone,
        [ALT_DOMAIN]: altZone,
        [`www.${ALT_DOMAIN}`]: altZone,
      }),
    });

    this.siteBucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: `signeddata-org-www-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const oac = new cloudfront.S3OriginAccessControl(this, "SiteOAC", {
      description: "OAC for signed-data.org marketing site",
    });

    this.distribution = new cloudfront.Distribution(this, "SiteDist", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
      },
      domainNames: [
        PRIMARY_DOMAIN,
        `www.${PRIMARY_DOMAIN}`,
        ALT_DOMAIN,
        `www.${ALT_DOMAIN}`,
      ],
      certificate,
      defaultRootObject: "index.html",
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    });

    const cfTarget = new route53targets.CloudFrontTarget(this.distribution);

    new route53.ARecord(this, "PrimaryARecord", {
      zone: primaryZone,
      recordName: PRIMARY_DOMAIN,
      target: route53.RecordTarget.fromAlias(cfTarget),
    });
    new route53.ARecord(this, "PrimaryWwwARecord", {
      zone: primaryZone,
      recordName: `www.${PRIMARY_DOMAIN}`,
      target: route53.RecordTarget.fromAlias(cfTarget),
    });
    new route53.ARecord(this, "AltARecord", {
      zone: altZone,
      recordName: ALT_DOMAIN,
      target: route53.RecordTarget.fromAlias(cfTarget),
    });
    new route53.ARecord(this, "AltWwwARecord", {
      zone: altZone,
      recordName: `www.${ALT_DOMAIN}`,
      target: route53.RecordTarget.fromAlias(cfTarget),
    });

    new cdk.CfnOutput(this, "SiteUrl", {
      value: `https://${PRIMARY_DOMAIN}`,
      description: "Primary site URL",
    });
    new cdk.CfnOutput(this, "DistributionId", {
      value: this.distribution.distributionId,
      description: "CloudFront distribution ID (invalidations)",
      exportName: "SignedDataOrgHomeCfDistId",
    });
    new cdk.CfnOutput(this, "SiteBucketName", {
      value: this.siteBucket.bucketName,
      description: "S3 bucket for static assets",
      exportName: "SignedDataOrgHomeSiteBucket",
    });
  }
}
