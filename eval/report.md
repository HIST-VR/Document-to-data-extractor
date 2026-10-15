# Eval report

Twelve synthetic documents. Companies, names, and identifiers are fictional. HTML is rendered to PDF in headless Edge or Chrome, except `invoice-scan`, which is a PNG screenshot of the same HTML with a grayscale filter.

## Validator

| Document | Type | File | Validation errors | Planted | Caught |
| --- | --- | --- | ---: | ---: | ---: |
| invoice-classic | invoice | invoice-classic.pdf | 0 | 0 | 0 |
| invoice-narrow | invoice | invoice-narrow.pdf | 0 | 0 | 0 |
| invoice-english | invoice | invoice-english.pdf | 0 | 0 | 0 |
| invoice-vat7 | invoice | invoice-vat7.pdf | 0 | 0 | 0 |
| act-services | act | act-services.pdf | 0 | 0 | 0 |
| act-no-iban | act | act-no-iban.pdf | 0 | 0 | 0 |
| waybill-goods | waybill | waybill-goods.pdf | 0 | 0 | 0 |
| waybill-russian | waybill | waybill-russian.pdf | 0 | 0 | 0 |
| invoice-twopage | invoice | invoice-twopage.pdf | 0 | 0 | 0 |
| waybill-open | waybill | waybill-open.pdf | 0 | 0 | 0 |
| invoice-scan | invoice | invoice-scan.png | 0 | 0 | 0 |
| invoice-bad-math | invoice | invoice-bad-math.pdf | 1 | 1 | 1 |

Planted defects caught on the printed ground truth: 1 of 1.
This table is the shared validator. It is not a model score.

## Model

The live Gemini run was not done because GEMINI_API_KEY was not set. This report has no field-accuracy number.
