import  * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as asg from 'aws-cdk-lib/aws-autoscaling';
import * as elb from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
import { Helper } from './helper';

interface AppStackProps extends cdk.StackProps {
  prefixName: string,
  vpc: ec2.Vpc;
}

export class AppStack extends cdk.Stack {
  readonly appIamRole: iam.Role;
  readonly appAsg: asg.AutoScalingGroup;
  readonly appAlb: elb.ApplicationLoadBalancer;
  readonly databaseInstance: rds.DatabaseInstance;

  constructor(scope: Construct, id: string, props?: AppStackProps) {
    super(scope, id, props);

    const vpc = props?.vpc;

    // Add tags to all assets within this stack
    cdk.Tags.of(this).add("CreatedBy", "CDK", { priority: 300 });
    cdk.Tags.of(this).add("Project", "AwsCdkThreeTierAppWorkshop", {
      priority: 300,
    });
    cdk.Tags.of(this).add("Owner", "Ashish Patel", { priority: 300 });
    cdk.Tags.of(this).add("CostCenter", "ABCD1234", { priority: 300 });
  }
}
