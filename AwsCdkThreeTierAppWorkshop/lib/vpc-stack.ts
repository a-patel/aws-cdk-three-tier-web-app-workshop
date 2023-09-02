import  * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';
import { Helper } from './helper';

interface VpcStackProps extends cdk.StackProps {
  prefixName: string, // <--- prefix name, for all resource
  cidr: string, // <--- each VPC will need a Cidr
  maxAzs?: number, // <--- optionally the number of Availability Zones can be provided; defaults to 2 in our particular case
}

export class VpcStack extends cdk.Stack {
  readonly vpc: ec2.Vpc;
  readonly publicSubnetIds: string[] = [];
  readonly appSubnetIds: string[] = [];
  readonly databaseSubnetIds: string[] = [];
  readonly workerSubnetIds: string[] = [];
  // readonly webElbSecurityGroup: ec2.SecurityGroup;
  // readonly webSecurityGroup: ec2.SecurityGroup;
  readonly appElbSecurityGroup: ec2.SecurityGroup;
  readonly appSecurityGroup: ec2.SecurityGroup;
  readonly databaseSecurityGroup: ec2.SecurityGroup;
  readonly bastionSecurityGroup: ec2.SecurityGroup;

  constructor(scope: Construct, id: string, props?: VpcStackProps) {
    super(scope, id, props);

    // get Account, Region, Availability Zones
    console.log("accountId: ", cdk.Stack.of(this).account);
    console.log("region: ", cdk.Stack.of(this).region);
    console.log("availability zones: ", cdk.Stack.of(this).availabilityZones);

    this.vpc = new ec2.Vpc(this, "VPC", {
      vpcName: `${props?.prefixName}-vpc`,
      ipAddresses: ec2.IpAddresses.cidr(props?.cidr!),
      maxAzs: props?.maxAzs,
      natGateways: 2,
      subnetConfiguration: [
        {
          name: "PublicSubnet",
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: "AppSubnet",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 20,
        },
        {
          name: "DatabaseSubnet",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
          cidrMask: 24,
        },
        {
          name: "WorkerSubnet",
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 20,
        },
      ],

      createInternetGateway: true,

      enableDnsHostnames: true,
      enableDnsSupport: true,
      // defaultInstanceTenancy: DefaultInstanceTenancy.DEFAULT,
    });

    // VPC Tagging

    // VPC Outputs
    new cdk.CfnOutput(this, "VPCId", {
      value: this.vpc.vpcId,
      description: "VPC ID",
      exportName: "VpcStack:vpcId",
    });

    new cdk.CfnOutput(this, "VpcCidr", {
      description: "VPC CIDR",
      exportName: `vpc-cidr`,
      value: this.vpc.vpcCidrBlock,
    });

    /*****   Subnets   *****/
    const publicSubnets = this.vpc.selectSubnets({
      subnetType: ec2.SubnetType.PUBLIC,
    });
    // const publicSubnets = this.vpc.publicSubnets;

    const appSubnets = this.vpc.selectSubnets({
      subnetGroupName: "AppSubnet",
      // subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
    });
    // const publicSubnets = this.vpc.appSubnets;

    const databaseSubnets = this.vpc.selectSubnets({
      subnetGroupName: "DatabaseSubnet",
      // subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
    });

    const workerSubnets = this.vpc.selectSubnets({
      subnetGroupName: "WorkerSubnet",
    });

    const allSubnets = [
      ...publicSubnets.subnets,
      ...appSubnets.subnets,
      ...databaseSubnets.subnets,
      ...workerSubnets.subnets,
    ];

    // Subnet Tagging
    for (const subnet of publicSubnets.subnets) {
      cdk.Aspects.of(subnet).add(
        new cdk.Tag(
          "Name",
          `${props?.prefixName}-Public-${Helper.getAZ(
            subnet.availabilityZone
          )}-snet`
        )
      );

      this.publicSubnetIds.push(subnet.subnetId);
    }

    for (const subnet of appSubnets.subnets) {
      cdk.Aspects.of(subnet).add(
        new cdk.Tag(
          "Name",
          `${props?.prefixName}-Private-${Helper.getAZ(
            subnet.availabilityZone
          )}-snet`
        )
      );

      this.appSubnetIds.push(subnet.subnetId);
    }

    for (const subnet of databaseSubnets.subnets) {
      cdk.Aspects.of(subnet).add(
        new cdk.Tag(
          "Name",
          Helper.getSubnetName(props?.prefixName!, "Database", subnet.availabilityZone)
        )
      );

      this.databaseSubnetIds.push(subnet.subnetId);
    }

    for (const subnet of workerSubnets.subnets) {
      cdk.Aspects.of(subnet).add(
        new cdk.Tag(
          "Name",
          `${props?.prefixName}-Worker-${Helper.getAZ(
            subnet.availabilityZone
          )}-snet`
        )
      );

      this.workerSubnetIds.push(subnet.subnetId);
    }

    // Subnet Output

    // const publicSubnetA = new PublicSubnet(this, "PublicSubnetA", {
    //   // name: "EksCdkWorkshop-public-snet",
    //   vpcId: vpc.vpcId,
    //   cidrBlock: "10.0.0.0/24",
    //   availabilityZone: vpc.availabilityZones[0],
    //   mapPublicIpOnLaunch: true
    // });

    // const securityGroup = new SecurityGroup(this, 'sg', {
    //   vpc: vpc
    // });

    // this.ingressSecurityGroup = new SecurityGroup(this, 'ingress-security-group', {
    //   vpc: this.vpc,
    //   allowAllOutbound: false,
    //   securityGroupName: 'IngressSecurityGroup',
    // });

    // this.ingressSecurityGroup.addIngressRule(Peer.ipv4('10.0.0.0/16'), Port.tcp(3306));

    // this.egressSecurityGroup = new SecurityGroup(this, 'egress-security-group', {
    //     vpc: this.vpc,
    //     allowAllOutbound: false,
    //     securityGroupName: 'EgressSecurityGroup',
    // });

    // this.egressSecurityGroup.addEgressRule(Peer.anyIpv4(), Port.tcp(80));

    // const nacl = new NetworkAcl(this, 'MyApp-NetworkAcl', {
    //   vpc,
    //   networkAclName: 'IsolatedSubnetNACL',
    //   subnetSelection: databaseSubnets,
    // })



    /*****   Security Groups   *****/
    // Bastion security group
    this.bastionSecurityGroup = new ec2.SecurityGroup(this, 'Bastion-SG', {
        vpc: this.vpc,
        allowAllOutbound: false,
        securityGroupName: Helper.getSecurityGroupName(props?.prefixName!, "Bastion"),
    });

    this.bastionSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(22)
    );
    
    // Application ALB security group
    this.appElbSecurityGroup = new ec2.SecurityGroup(this, 'AppElb-SG', {
        vpc: this.vpc,
        allowAllOutbound: false,
        securityGroupName: Helper.getSecurityGroupName(props?.prefixName!, "AppElb"),
    });

    this.appElbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443)
    );

    this.appElbSecurityGroup.addIngressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80)
    );

    // App security group
    this.appSecurityGroup = new ec2.SecurityGroup(this, 'App-SG', {
        vpc: this.vpc,
        allowAllOutbound: false,
        securityGroupName: Helper.getSecurityGroupName(props?.prefixName!, "App"),
    });

    this.appSecurityGroup.addIngressRule(
      this.appElbSecurityGroup,
      ec2.Port.tcp(443)
    );

    this.appSecurityGroup.addIngressRule(
      this.appElbSecurityGroup,
      ec2.Port.tcp(80)
    );

    this.appSecurityGroup.addIngressRule(
      this.bastionSecurityGroup,
      ec2.Port.tcp(22)
    );

    // Database security group
    this.databaseSecurityGroup = new ec2.SecurityGroup(this, 'Database-SG', {
        vpc: this.vpc,
        allowAllOutbound: false,
        securityGroupName: Helper.getSecurityGroupName(props?.prefixName!, "Database"),
    });

    this.databaseSecurityGroup.addIngressRule(
      this.appSecurityGroup,
      ec2.Port.tcp(5432)
    );

    // Add tags to all assets within this stack
    cdk.Tags.of(this).add("CreatedBy", "CDK", { priority: 300 });
    cdk.Tags.of(this).add("Project", "AwsCdkThreeTierAppWorkshop", { priority: 300 });
    cdk.Tags.of(this).add("Owner", "Ashish Patel", { priority: 300 });
  }
}
