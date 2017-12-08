const request = require('superagent');
const { setupMutualTLS } = require('../certs-util');
const { URL } = require('url');
const log = require('debug')('log');
const debug = require('debug')('debug');
const error = require('debug')('error');

/**
 * @description Dual purpose: payments and payment-submissions
 * @param resourceServerPath
 * @param accessToken
 * @param headers
 * @param opts
 * @param risk
 * @param CreditorAccount
 * @param InstructedAmount
 * @param fapiFinancialId
 * @param idempotencyKey
 * @param paymentId < optional - only used for Payment Submission
 * @returns {Promise.<void>}
 */
const postPayments = async (resourceServerPath, paymentPathEndpoint, headers, paymentData) => {
  try {
    const host = resourceServerPath.split('/open-banking')[0]; // eslint-disable-line
    const paymentsUri = new URL(paymentPathEndpoint, host);
    log(`POST to ${paymentsUri}`);
    const payment = setupMutualTLS(request.post(paymentsUri))
      .set('authorization', `Bearer ${headers.accessToken}`)
      .set('x-jws-signature', 'not-required-swagger-to-be-changed')
      .set('x-fapi-financial-id', headers.fapiFinancialId)
      .set('x-idempotency-key', headers.idempotencyKey)
      .set('content-type', 'application/json; charset=utf-8')
      .set('accept', 'application/json; charset=utf-8');
    if (headers.customerLastLogged) payment.set('x-fapi-customer-last-logged-time', headers.customerLastLogged);
    if (headers.customerIp) payment.set('x-fapi-customer-ip-address', headers.customerIp);
    if (headers.interactionId) payment.set('x-fapi-interaction-id', headers.interactionId);

    payment.send(paymentData);
    const response = await payment;
    debug(`${response.status} response for ${paymentsUri}`);

    return response.body;
  } catch (err) {
    if (err.response && err.response.text) {
      error(err.response.text);
    }
    const e = new Error(err.message);
    e.status = err.response ? err.response.status : 500;
    throw e;
  }
};

exports.postPayments = postPayments;