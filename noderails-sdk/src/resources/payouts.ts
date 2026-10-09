import type { HttpClient, PaginatedResult } from "../http";
import type {
  PayoutCreateParams,
  PayoutExecuteParams,
  PayoutExecuteResult,
  PayoutIntent,
  PayoutListParams,
} from "../types/payout";

export class Payouts {
  constructor(
    private readonly http: HttpClient,
    private readonly appId: string,
  ) {}

  async create(params: PayoutCreateParams): Promise<PayoutIntent> {
    return this.http.request<PayoutIntent>({
      method: "POST",
      path: "/payouts",
      body: { appId: this.appId, ...params } as unknown as Record<string, unknown>,
    });
  }

  async retrieve(id: string): Promise<PayoutIntent> {
    return this.http.request<PayoutIntent>({
      method: "GET",
      path: `/payouts/${id}`,
    });
  }

  async list(params?: PayoutListParams): Promise<PaginatedResult<PayoutIntent>> {
    return this.http.requestPaginated<PayoutIntent>({
      method: "GET",
      path: "/payouts",
      query: { appId: this.appId, ...params } as Record<string, string | number | boolean | undefined>,
    });
  }

  async execute(id: string, params?: PayoutExecuteParams): Promise<PayoutExecuteResult> {
    return this.http.request<PayoutExecuteResult>({
      method: "POST",
      path: `/payouts/${id}/execute`,
      body: { ...(params ?? {}) },
    });
  }

  async cancel(id: string): Promise<PayoutIntent> {
    return this.http.request<PayoutIntent>({
      method: "POST",
      path: `/payouts/${id}/cancel`,
      body: {},
    });
  }
}
