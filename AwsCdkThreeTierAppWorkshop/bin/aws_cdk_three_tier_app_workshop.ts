#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { VpcStack } from '../lib/vpc-stack';
import { AppStack } from '../lib/app-stack';


const app = new cdk.App();

// const account = app.node.tryGetContext('account') || process.env.CDK_INTEG_ACCOUNT || process.env.CDK_DEFAULT_ACCOUNT;
const env = {account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION};

console.log('accountId: ', env.account);
console.log('region: ', env.region);


const vpcStack = new VpcStack(
  app,
  "AwsCdkThreeTierAppWorkshopVpcStack",
  {
    prefixName: "AwsCdkThreeTierAppWorkshop",
    cidr: "10.0.0.0/16",
    maxAzs: 2,
    env: env,
    description: "Aws Cdk Three-Tier App Workshop VPC Stack"
  }
);

const appStack = new AppStack(app, 'AwsCdkThreeTierAppWorkshopAppStack', {
  prefixName: 'AwsCdkThreeTierAppWorkshop',
  vpc: vpcStack.vpc,
  env: env,
  description: "Aws Cdk Three-Tier App Workshop App Stack"
});
appStack.addDependency(vpcStack);
