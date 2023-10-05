import { Injective } from './injective';
import {
  BalancesRequest,
  BalancesResponse,
  PollRequest,
  PollResponse,
  TransferRequest,
  TransferResponse,
} from './injective.requests';
import {
  validateBalanceRequest,
  validatePollRequest,
  validateTransferRequest,
} from './injective.validators';

export class InjectiveController {
  static async currentBlockNumber(injective: Injective): Promise<number> {
    return injective.currentBlockNumber();
  }

  static async transfer(
    injective: Injective,
    req: TransferRequest
  ): Promise<TransferResponse> {
    validateTransferRequest(req);

    if (req.from.length > req.to.length) {
      return injective.transferToBankAccount(req.amount, req.token);
    } else {
      return injective.transferToSubAccount(req.amount, req.token);
    }
  }

  static async balances(
    injective: Injective,
    req: BalancesRequest
  ): Promise<BalancesResponse> {
    validateBalanceRequest(req);
    return injective.balances();
  }

  static async poll(
    injective: Injective,
    req: PollRequest
  ): Promise<PollResponse> {
    validatePollRequest(req);

    return injective.poll(req.txHash);
  }
}
