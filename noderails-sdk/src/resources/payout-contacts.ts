import type { HttpClient, PaginatedResult } from "../http";
import type {
  PayoutContact,
  PayoutContactCreateParams,
  PayoutContactImportParams,
  PayoutContactImportResult,
  PayoutContactListParams,
  PayoutContactUpdateParams,
} from "../types/payout";

export class PayoutContacts {
  constructor(
    private readonly http: HttpClient,
    private readonly appId: string,
  ) {}

  async create(params: PayoutContactCreateParams): Promise<PayoutContact> {
    return this.http.request<PayoutContact>({
      method: "POST",
      path: `/apps/${this.appId}/payout-contacts`,
      body: params as unknown as Record<string, unknown>,
    });
  }

  async retrieve(id: string): Promise<PayoutContact> {
    return this.http.request<PayoutContact>({
      method: "GET",
      path: `/apps/${this.appId}/payout-contacts/${id}`,
    });
  }

  async list(params?: PayoutContactListParams): Promise<PaginatedResult<PayoutContact>> {
    return this.http.requestPaginated<PayoutContact>({
      method: "GET",
      path: `/apps/${this.appId}/payout-contacts`,
      query: params as Record<string, string | number | boolean | undefined>,
    });
  }

  async update(id: string, params: PayoutContactUpdateParams): Promise<PayoutContact> {
    return this.http.request<PayoutContact>({
      method: "PUT",
      path: `/apps/${this.appId}/payout-contacts/${id}`,
      body: params as unknown as Record<string, unknown>,
    });
  }

  async delete(id: string): Promise<void> {
    await this.http.request<void>({
      method: "DELETE",
      path: `/apps/${this.appId}/payout-contacts/${id}`,
    });
  }

  async importCsv(params: PayoutContactImportParams): Promise<PayoutContactImportResult> {
    return this.http.request<PayoutContactImportResult>({
      method: "POST",
      path: `/apps/${this.appId}/payout-contacts/import`,
      body: params as unknown as Record<string, unknown>,
    });
  }
}
