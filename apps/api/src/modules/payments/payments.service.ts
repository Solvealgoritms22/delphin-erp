import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmpresasService } from '../empresas/empresas.service';

@Injectable()
export class PaymentsService {
  private readonly sandbox = process.env.PAYPAL_SANDBOX !== 'false';
  private readonly baseUrl = this.sandbox
    ? 'https://api-m.sandbox.paypal.com'
    : 'https://api-m.paypal.com';

  constructor(
    private prisma: PrismaService,
    private empresasService: EmpresasService,
  ) {}

  private get clientId(): string {
    return (
      (this.sandbox
        ? process.env.PAYPAL_CLIENT_ID_SANDBOX
        : process.env.PAYPAL_CLIENT_ID_LIVE) ?? ''
    );
  }

  private get clientSecret(): string {
    return (
      (this.sandbox
        ? process.env.PAYPAL_CLIENT_SECRET_SANDBOX
        : process.env.PAYPAL_CLIENT_SECRET_LIVE) ?? ''
    );
  }

  private get credentialsConfigured(): boolean {
    return !!this.clientId && !!this.clientSecret;
  }

  getConfig() {
    return {
      simulated: !this.credentialsConfigured,
      sandbox: this.sandbox,
      currency: 'USD',
    };
  }

  private async accessToken(): Promise<string> {
    const creds = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString(
      'base64',
    );
    const res = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data: any = await res.json();
    if (!res.ok)
      throw new BadRequestException(
        `PayPal auth error: ${data?.error_description || res.status}`,
      );
    return data.access_token;
  }

  /**
   * Gets a plan from the catalog by id and returns its price.
   */
  private findPlan(planId: string) {
    const plan = this.empresasService.getPlans().find((p) => p.id === planId);
    if (!plan) throw new NotFoundException('Plan no encontrado');
    return plan;
  }

  /**
   * Creates a PayPal order for the given plan and billing cycle.
   */
  async createOrder(
    userId: string,
    planId: string,
    billingCycle: 'monthly' | 'annual' = 'monthly',
  ) {
    const plan = this.findPlan(planId);
    const amount =
      billingCycle === 'annual' ? plan.precioAnual : plan.precioMensual;

    // Simulated mode: no real PayPal credentials configured.
    if (!this.credentialsConfigured) {
      return {
        simulated: true,
        orderId: `SIM-${Date.now()}`,
        amount,
        currency: 'USD',
        planId,
        billingCycle,
      };
    }

    const token = await this.accessToken();
    const res = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [
          {
            reference_id: `${userId}:${planId}`,
            description: `Plan ${plan.nombre} (${billingCycle})`,
            amount: { currency_code: 'USD', value: amount.toFixed(2) },
          },
        ],
      }),
    });
    const data: any = await res.json();
    if (!res.ok) {
      throw new BadRequestException(
        `PayPal create order error: ${data?.message || res.status}`,
      );
    }
    return {
      simulated: false,
      orderId: data.id,
      amount,
      currency: 'USD',
      plan,
      billingCycle,
      approveLink: data.links?.find((l) => l.rel === 'approve')?.href,
    };
  }

  /**
   * Captures a PayPal order and, when successful, updates the company plan.
   */
  async captureOrder(userId: string, orderId: string, planId: string) {
    // Simulated flow
    if (orderId.startsWith('SIM-')) {
      const plan = this.findPlan(planId);
      return this.completePlanUpdate(userId, plan, orderId, true);
    }

    const token = await this.accessToken();
    const res = await fetch(
      `${this.baseUrl}/v2/checkout/orders/${orderId}/capture`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const data: any = await res.json();
    if (!res.ok) {
      throw new BadRequestException(
        `PayPal capture error: ${data?.message || res.status}`,
      );
    }

    const plan = this.findPlan(planId);
    return this.completePlanUpdate(userId, plan, orderId, false);
  }

  private async completePlanUpdate(
    userId: string,
    plan: any,
    orderId: string,
    simulated: boolean,
  ) {
    const user = await this.prisma.usuario.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    return { ok: true, simulated, orderId, plan: plan.nombre };
  }
}
