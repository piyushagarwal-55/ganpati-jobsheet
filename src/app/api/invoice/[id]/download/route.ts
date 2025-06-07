

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '../../../../../../supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const quotationId = params.id;
    const supabase = await createClient();

    // Get quotation and invoice details
    const { data: quotation, error: quotationError } = await supabase
      .from("quotation_requests")
      .select("*")
      .eq("id", quotationId)
      .single();

    if (quotationError || !quotation) {
      return NextResponse.json({ error: "Quotation not found" }, { status: 404 });
    }

    if (!quotation.invoice_number) {
      return NextResponse.json({ error: "Invoice not generated" }, { status: 400 });
    }

    // Get invoice details
    const { data: invoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("quotation_id", quotationId)
      .single();

    // Generate PDF content (simple HTML for now)
    const invoiceHtml = generateInvoiceHTML(quotation, invoice);

    // For now, return HTML. In production, you'd convert this to PDF
    return new NextResponse(invoiceHtml, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': `attachment; filename=Invoice-${quotation.invoice_number}.html`,
      },
    });

  } catch (error) {
    console.error('Error downloading invoice:', error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

function generateInvoiceHTML(quotation: any, invoice: any) {
  const invoiceDate = new Date(quotation.invoice_date).toLocaleDateString('en-IN');
  const subtotal = quotation.final_price;
  const taxAmount = quotation.tax_amount || (subtotal * 0.18);
  const totalAmount = quotation.total_amount || (subtotal + taxAmount);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Invoice ${quotation.invoice_number}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            line-height: 1.6;
        }
        .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .company-name {
            font-size: 28px;
            font-weight: bold;
            color: #333;
            margin-bottom: 5px;
        }
        .invoice-title {
            font-size: 24px;
            color: #666;
            margin-top: 20px;
        }
        .invoice-details {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }
        .client-info, .invoice-info {
            width: 45%;
        }
        .section-title {
            font-weight: bold;
            color: #333;
            margin-bottom: 10px;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
        }
        .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }
        .details-table th,
        .details-table td {
            border: 1px solid #ddd;
            padding: 12px;
            text-align: left;
        }
        .details-table th {
            background-color: #f5f5f5;
            font-weight: bold;
        }
        .total-section {
            margin-top: 30px;
            text-align: right;
        }
        .total-row {
            display: flex;
            justify-content: space-between;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .total-row.final {
            font-weight: bold;
            font-size: 18px;
            border-bottom: 2px solid #333;
            margin-top: 10px;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            color: #666;
            font-size: 14px;
            border-top: 1px solid #ddd;
            padding-top: 20px;
        }
        @media print {
            body { margin: 0; }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="company-name">GanpathiOverseas</div>
        <div>Print Services</div>
        <div class="invoice-title">INVOICE</div>
    </div>

    <div class="invoice-details">
        <div class="client-info">
            <div class="section-title">Bill To:</div>
            <div><strong>${quotation.client_name}</strong></div>
            <div>${quotation.client_email}</div>
            ${quotation.client_phone ? `<div>${quotation.client_phone}</div>` : ''}
            ${quotation.company_name ? `<div>${quotation.company_name}</div>` : ''}
        </div>
        
        <div class="invoice-info">
            <div class="section-title">Invoice Details:</div>
            <div><strong>Invoice #:</strong> ${quotation.invoice_number}</div>
            <div><strong>Date:</strong> ${invoiceDate}</div>
            <div><strong>Status:</strong> ${quotation.status}</div>
        </div>
    </div>

    <table class="details-table">
        <thead>
            <tr>
                <th>Description</th>
                <th>Specifications</th>
                <th>Quantity</th>
                <th>Rate</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td>
                    <strong>${quotation.project_title}</strong>
                    ${quotation.project_description ? `<br><small>${quotation.project_description}</small>` : ''}
                </td>
                <td>
                    <div><strong>Type:</strong> ${quotation.print_type}</div>
                    <div><strong>Paper:</strong> ${quotation.paper_type}</div>
                    <div><strong>Size:</strong> ${quotation.paper_size}</div>
                    <div><strong>Color:</strong> ${quotation.color_type}</div>
                    ${quotation.binding_type ? `<div><strong>Binding:</strong> ${quotation.binding_type}</div>` : ''}
                    ${quotation.lamination ? `<div><strong>Lamination:</strong> ${quotation.lamination}</div>` : ''}
                </td>
                <td>${quotation.quantity}</td>
                <td>₹${(subtotal / quotation.quantity).toFixed(2)}</td>
                <td>₹${subtotal.toFixed(2)}</td>
            </tr>
        </tbody>
    </table>

    <div class="total-section">
        <div class="total-row">
            <span>Subtotal:</span>
            <span>₹${subtotal.toFixed(2)}</span>
        </div>
        <div class="total-row">
            <span>GST (18%):</span>
            <span>₹${taxAmount.toFixed(2)}</span>
        </div>
        <div class="total-row final">
            <span>Total Amount:</span>
            <span>₹${totalAmount.toFixed(2)}</span>
        </div>
    </div>

    <div class="footer">
        <p><strong>Thank you for your business!</strong></p>
        <p>GanpathiOverseas Print Services</p>
        <p>For any queries, please contact us.</p>
    </div>

    <script>
        // Auto-print when opened
        window.onload = function() {
            window.print();
        }
    </script>
</body>
</html>`;
}