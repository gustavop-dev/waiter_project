import {callKw} from './odoo'
export interface Coupon {id?:number;name:string;code:string;percent:number;minimum:number;start:string;end:string;active:boolean}
export interface PointsSettings {name:string;spendPerPoint:number;valuePerPoint:number;minimumPoints:number}
export interface BenefitsSettings {coupons:Coupon[];loyalty:PointsSettings|null}
export const benefitsSettings=(configId:number,coupon?:Coupon,loyalty?:PointsSettings)=>callKw<BenefitsSettings>('pos.config','waiter_benefits_settings',[[configId]],{coupon:coupon??null,loyalty:loyalty??null})
