import type { HttpClient, PaginatedResult } from "../http";
import type {
  PayoutSchedule,
  PayoutScheduleCreateParams,
  PayoutScheduleListParams,
} from "../types/payout";

export class PayoutSchedules {
  constructor(
    private readonly http: HttpClient,
    private readonly appId: string,
  ) {}

  async create(params: PayoutScheduleCreateParams): Promise<PayoutSchedule> {
    return this.http.request<PayoutSchedule>({
      method: "POST",
      path: "/payout-schedules",
      body: { appId: this.appId, ...params } as unknown as Record<string, unknown>,
    });
  }

  async retrieve(id: string): Promise<PayoutSchedule> {
    return this.http.request<PayoutSchedule>({
      method: "GET",
      path: `/payout-schedules/${id}`,
    });
  }

  async list(params?: PayoutScheduleListParams): Promise<PaginatedResult<PayoutSchedule>> {
    return this.http.requestPaginated<PayoutSchedule>({
      method: "GET",
      path: "/payout-schedules",
      query: { appId: this.appId, ...params } as Record<string, string | number | boolean | undefined>,
    });
  }

  async pause(id: string): Promise<PayoutSchedule> {
    return this.http.request<PayoutSchedule>({
      method: "POST",
      path: `/payout-schedules/${id}/pause`,
      body: {},
    });
  }

  async resume(id: string): Promise<PayoutSchedule> {
    return this.http.request<PayoutSchedule>({
      method: "POST",
      path: `/payout-schedules/${id}/resume`,
      body: {},
    });
  }

  async cancel(id: string): Promise<PayoutSchedule> {
    return this.http.request<PayoutSchedule>({
      method: "POST",
      path: `/payout-schedules/${id}/cancel`,
      body: {},
    });
  }
}
