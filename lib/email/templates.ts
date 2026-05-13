export const DEFAULT_EMAIL_BODY_TEMPLATE = `{supplierName} 御中

いつもお世話になっております。
{senderCompanyName} より下記の発注書をお送りします。

件名：{subject}
発注No.：{documentNo}
発注日：{orderDate}

添付のPDFをご確認ください。

{senderCompanyName}
{contactPerson}`.trim()
