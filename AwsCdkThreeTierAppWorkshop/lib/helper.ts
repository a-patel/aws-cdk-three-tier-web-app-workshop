import  * as cdk from 'aws-cdk-lib';
import { Peer, Port, SecurityGroup, SubnetType, IpAddresses, Vpc, PublicSubnet, NetworkAcl } from 'aws-cdk-lib/aws-ec2';
import { Construct } from 'constructs';


export class Helper {
  public static getAZ(azName: string): string {
      return azName.slice(-1);
  }

  public static getSubnetName(prefixName: string, tierName: string, azName: string): string {
      return `${prefixName}-${tierName}-${Helper.getAZ(azName)}-snet`
  }

  public static getSecurityGroupName(prefixName: string, typeName: string): string {
    return `${prefixName}-${typeName}-sg`;
  }

  public static getNetworkAclName(prefixName: string, typeName: string): string {
    return `${prefixName}-${typeName}-nacl`;
  }

}
