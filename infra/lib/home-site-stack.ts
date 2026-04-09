import * as acm from 'aws-cdk-lib/aws-certificatemanager'
import * as cdk from 'aws-cdk-lib'
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront'
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins'
import * as route53 from 'aws-cdk-lib/aws-route53'
import * as route53targets from 'aws-cdk-lib/aws-route53-targets'
import * as s3 from 'aws-cdk-lib/aws-s3'

import { Construct } from 'constructs'

const PRIMARY_DOMAIN = 'signed-data.org'
const ALT_DOMAIN = 'signeddata.org'

/**
 * Static marketing site: private S3, CloudFront OAC, ACM, Route53.
 * Bucket name avoids collision with signed-data/cds stack (`signeddata-site-*`).
 */
export class HomeSiteStack extends cdk.Stack {
  public readonly siteBucket: s3.Bucket
  public readonly distribution: cloudfront.Distribution

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    const primaryZone = route53.HostedZone.fromLookup(this, 'PrimaryZone', {
      domainName: PRIMARY_DOMAIN,
    })

    const altZone = route53.HostedZone.fromLookup(this, 'AltZone', {
      domainName: ALT_DOMAIN,
    })

    const certificate = new acm.Certificate(this, 'SiteCert', {
      domainName: PRIMARY_DOMAIN,
      subjectAlternativeNames: [`www.${PRIMARY_DOMAIN}`, ALT_DOMAIN, `www.${ALT_DOMAIN}`],
      validation: acm.CertificateValidation.fromDnsMultiZone({
        [PRIMARY_DOMAIN]: primaryZone,
        [`www.${PRIMARY_DOMAIN}`]: primaryZone,
        [ALT_DOMAIN]: altZone,
        [`www.${ALT_DOMAIN}`]: altZone,
      }),
    })

    this.siteBucket = new s3.Bucket(this, 'SiteBucket', {
      bucketName: `signeddata-org-www-${this.account}-${this.region}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    })

    const oac = new cloudfront.S3OriginAccessControl(this, 'SiteOAC', {
      description: 'OAC for signed-data.org marketing site',
    })

    // Two responsibilities, one viewer-request function (CloudFront allows
    // only one function per behavior per event type):
    //   1. 301 any non-canonical hostname (www.signed-data.org, signeddata.org,
    //      www.signeddata.org) → https://signed-data.org<uri><querystring>.
    //   2. For the canonical host, rewrite directory URIs to index.html so
    //      i18n subpaths like /pt-br/ resolve to the right object in S3.
    const indexRewrite = new cloudfront.Function(this, 'IndexRewriteFn', {
      code: cloudfront.FunctionCode.fromInline(
        `
function handler(event) {
  var request = event.request;
  var host = request.headers.host && request.headers.host.value;

  if (host && host !== '${PRIMARY_DOMAIN}') {
    var qs = request.querystring;
    var parts = [];
    for (var k in qs) {
      if (qs[k].multiValue) {
        for (var i = 0; i < qs[k].multiValue.length; i++) {
          parts.push(k + '=' + qs[k].multiValue[i].value);
        }
      } else {
        parts.push(k + '=' + qs[k].value);
      }
    }
    var qsString = parts.length ? '?' + parts.join('&') : '';
    return {
      statusCode: 301,
      statusDescription: 'Moved Permanently',
      headers: {
        location: { value: 'https://${PRIMARY_DOMAIN}' + request.uri + qsString },
      },
    };
  }

  var uri = request.uri;
  if (uri.endsWith('/')) {
    request.uri += 'index.html';
  } else if (!uri.includes('.')) {
    request.uri += '/index.html';
  }
  return request;
}
      `.trim(),
      ),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: '301 non-canonical hosts to signed-data.org; index.html rewrite for i18n subpaths',
    })

    this.distribution = new cloudfront.Distribution(this, 'SiteDist', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.siteBucket, {
          originAccessControl: oac,
        }),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        compress: true,
        functionAssociations: [
          {
            function: indexRewrite,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      domainNames: [PRIMARY_DOMAIN, `www.${PRIMARY_DOMAIN}`, ALT_DOMAIN, `www.${ALT_DOMAIN}`],
      certificate,
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 403,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
        },
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: '/404.html',
        },
      ],
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
    })

    const cfTarget = new route53targets.CloudFrontTarget(this.distribution)

    new route53.ARecord(this, 'PrimaryARecord', {
      zone: primaryZone,
      recordName: PRIMARY_DOMAIN,
      target: route53.RecordTarget.fromAlias(cfTarget),
    })
    new route53.ARecord(this, 'PrimaryWwwARecord', {
      zone: primaryZone,
      recordName: `www.${PRIMARY_DOMAIN}`,
      target: route53.RecordTarget.fromAlias(cfTarget),
    })
    new route53.ARecord(this, 'AltARecord', {
      zone: altZone,
      recordName: ALT_DOMAIN,
      target: route53.RecordTarget.fromAlias(cfTarget),
    })
    new route53.ARecord(this, 'AltWwwARecord', {
      zone: altZone,
      recordName: `www.${ALT_DOMAIN}`,
      target: route53.RecordTarget.fromAlias(cfTarget),
    })

    new cdk.CfnOutput(this, 'SiteUrl', {
      value: `https://${PRIMARY_DOMAIN}`,
      description: 'Primary site URL',
    })
    new cdk.CfnOutput(this, 'DistributionId', {
      value: this.distribution.distributionId,
      description: 'CloudFront distribution ID (invalidations)',
      exportName: 'SignedDataOrgHomeCfDistId',
    })
    new cdk.CfnOutput(this, 'SiteBucketName', {
      value: this.siteBucket.bucketName,
      description: 'S3 bucket for static assets',
      exportName: 'SignedDataOrgHomeSiteBucket',
    })
  }
}
