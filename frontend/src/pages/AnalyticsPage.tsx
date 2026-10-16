import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  DailySalesItem, 
  CategoryMetricItem, 
  PaymentMethodItem, 
  DeliveryLeadTimeItem,
  CustomerBehaviorCohort,
  FulfillmentMonth
} from '../types';
import { MonochromeBarChart, MonochromeLineChart } from '../components/MonochromeChart';
import { InteractiveSalesTrendChart } from '../components/InteractiveSalesTrendChart';
import { 
  BarChart3, 
  TrendingUp, 
  CreditCard, 
  Truck, 
  Filter,
  Info,
  Users,
  CheckCircle2,
  Clock,
  Calculator
} from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const [dailySales, setDailySales] = useState<DailySalesItem[]>([]);
  const [categories, setCategories] = useState<CategoryMetricItem[]>([]);
  const [payments, setPayments] = useState<PaymentMethodItem[]>([]);
  const [deliveryTimes, setDeliveryTimes] = useState<DeliveryLeadTimeItem[]>([]);
  const [customerCohorts, setCustomerCohorts] = useState<CustomerBehaviorCohort[]>([]);
  const [fulfillmentData, setFulfillmentData] = useState<FulfillmentMonth[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'ALL' | '2017' | '2018'>('ALL');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [salesRes, catRes, payRes, delRes, cohortsRes, fulfillRes] = await Promise.all([
        api.getDailySales().catch(() => []),
        api.getCategoryMetrics(10).catch(() => []),
        api.getPaymentBreakdown().catch(() => []),
        api.getDeliveryLeadTimes(10).catch(() => []),
        api.getCustomerBehaviorAnalytics().catch(() => []),
        api.getFulfillmentAnalytics().catch(() => [])
      ]);
      setDailySales(salesRes);
      setCategories(catRes);
      setPayments(payRes);
      setDeliveryTimes(delRes);
      setCustomerCohorts(cohortsRes);
      setFulfillmentData(fulfillRes);
    } catch (e) {
      console.error('Failed to load analytics data:', e);
    } finally {
      setLoading(false);
    }
  };

  // Filter daily sales based on time window
  const filteredDailySales = dailySales.filter(d => {
    if (timeFilter === 'ALL') return true;
    return d.date.startsWith(timeFilter);
  });

  const lineChartData = filteredDailySales.map(d => ({
    x: d.date.slice(5), // MM-DD
    y: Math.round(d.sales)
  }));

  const categoryBarData = categories.map(c => ({
    label: c.category,
    value: Math.round(c.sales),
    sublabel: `${c.items_sold.toLocaleString()} items`
  }));

  const paymentBarData = payments.map(p => ({
    label: p.method,
    value: Math.round(p.total_value),
    sublabel: `${p.transactions.toLocaleString()} txns`
  }));

  const deliveryBarData = deliveryTimes.map(d => ({
    label: d.state,
    value: d.avg_days,
    sublabel: `${d.delivered_orders.toLocaleString()} orders`
  }));

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Header */}
      <div className="border-b border-[#E2E8F0] pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-2">
            <BarChart3 className="w-4 h-4 text-purple-600" />
            <span>Downstream Analytical Marts</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-[#172B4D]">
            Commercial & Fulfillment Marts
          </h1>
          <p className="text-sm text-[#64748B] mt-1 max-w-2xl leading-relaxed">
            Curated business metrics derived directly from tested dimensional models (<code className="text-[#172B4D] font-mono bg-[#F1F5F9] px-1 py-0.5 rounded text-xs">mart_daily_sales</code>, <code className="text-[#172B4D] font-mono bg-[#F1F5F9] px-1 py-0.5 rounded text-xs">mart_customer_behavior</code>, and <code className="text-[#172B4D] font-mono bg-[#F1F5F9] px-1 py-0.5 rounded text-xs">mart_fulfillment_performance</code>).
          </p>
        </div>

        {/* Time Filter Controls */}
        <div className="flex items-center gap-2 border border-[#E2E8F0] bg-white p-1 rounded-lg shadow-sm text-xs">
          <Filter className="w-3.5 h-3.5 text-[#64748B] ml-2" />
          <span className="text-[#64748B] text-xs mr-1">Period:</span>
          {(['ALL', '2017', '2018'] as const).map(year => (
            <button
              key={year}
              onClick={() => setTimeFilter(year)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                timeFilter === year
                  ? 'bg-[#334155] text-white shadow-sm'
                  : 'text-[#64748B] hover:text-[#172B4D]'
              }`}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Calculation Formulas Card */}
      <div className="border border-[#E2E8F0] bg-white rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#172B4D]">
          <Calculator className="w-4 h-4 text-[#334155]" />
          <span>Metric Definitions & Analytical Formulation</span>
        </div>
        <p className="text-xs text-[#64748B]">
          All metric formulas, grain definitions, and inclusion criteria are codified in dbt macros:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          <div className="p-4 border border-[#E2E8F0] bg-[#F8FAFC] rounded-lg space-y-1.5">
            <div className="text-[10px] font-semibold text-[#64748B] uppercase">Gross Merchandise Value (GMV)</div>
            <div className="text-xs font-mono text-[#172B4D] font-bold">
              SUM(item_price) + SUM(freight_value)
            </div>
            <div className="text-[11px] text-[#64748B] leading-relaxed">
              Aggregated at <code className="text-[#172B4D] font-mono">order_id</code> grain. Excludes non-monetary test orders.
            </div>
          </div>

          <div className="p-4 border border-[#E2E8F0] bg-[#F8FAFC] rounded-lg space-y-1.5">
            <div className="text-[10px] font-semibold text-[#64748B] uppercase">Average Order Value (AOV)</div>
            <div className="text-xs font-mono text-[#172B4D] font-bold">
              Total Item Revenue / Placed Orders
            </div>
            <div className="text-[11px] text-[#64748B] leading-relaxed">
              Evaluated strictly on delivered and shipped orders. Excludes cancelled orders.
            </div>
          </div>

          <div className="p-4 border border-[#E2E8F0] bg-[#F8FAFC] rounded-lg space-y-1.5">
            <div className="text-[10px] font-semibold text-[#64748B] uppercase">On-Time Delivery SLA %</div>
            <div className="text-xs font-mono text-[#172B4D] font-bold">
              (On-Time Delivered / Delivered) &times; 100
            </div>
            <div className="text-[11px] text-[#64748B] leading-relaxed">
              Delivered before or on estimated date. Excludes active in-transit orders.
            </div>
          </div>

          <div className="p-4 border border-[#E2E8F0] bg-[#F8FAFC] rounded-lg space-y-1.5">
            <div className="text-[10px] font-semibold text-[#64748B] uppercase">Transit Lead Time</div>
            <div className="text-xs font-mono text-[#172B4D] font-bold">
              delivered_date - purchase_timestamp
            </div>
            <div className="text-[11px] text-[#64748B] leading-relaxed">
              Calculated in decimal days. Negative lead times quarantined during staging.
            </div>
          </div>
        </div>
      </div>

      {/* Grid of 4 Monochrome Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Interactive Daily Observed Sales Trend (Matching Reference Image 4) */}
        <div className="lg:col-span-2">
          <InteractiveSalesTrendChart data={filteredDailySales} />
        </div>

        {/* Chart 2: Top Product Categories */}
        <div className="border border-[#E2E8F0] bg-white p-6 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                Top Categories by Revenue
              </span>
            </div>
            <span className="text-xs text-[#64748B]">Top 10 Categories</span>
          </div>

          <MonochromeBarChart
            data={categoryBarData}
            height={220}
            valuePrefix="R$ "
          />

          <div className="text-xs text-[#64748B] border-t border-[#E2E8F0] pt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Translated to English via <code className="text-[#172B4D] font-mono">product_category_name_translation</code>.</span>
          </div>
        </div>

        {/* Chart 3: Payment Method Volume */}
        <div className="border border-[#E2E8F0] bg-white p-6 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                Payment Method Value Distribution
              </span>
            </div>
            <span className="text-xs text-[#64748B]">4 Payment Channels</span>
          </div>

          <MonochromeBarChart
            data={paymentBarData}
            height={220}
            valuePrefix="R$ "
          />

          <div className="text-xs text-[#64748B] border-t border-[#E2E8F0] pt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Includes credit card, boleto, voucher, and debit card transactions.</span>
          </div>
        </div>

        {/* Chart 4: Delivery Lead Times by State */}
        <div className="border border-[#E2E8F0] bg-white p-6 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-amber-600" />
              <span className="text-xs font-bold text-[#172B4D] uppercase tracking-wider">
                Average Delivery Lead Time (Days) by State
              </span>
            </div>
            <span className="text-xs text-[#64748B]">Top 10 Destination States</span>
          </div>

          <MonochromeBarChart
            data={deliveryBarData}
            height={220}
            valueSuffix=" days"
          />

          <div className="text-xs text-[#64748B] border-t border-[#E2E8F0] pt-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>Lead Time: order_delivered_customer_date - order_purchase_timestamp.</span>
          </div>
        </div>
      </div>

      {/* Customer Behavior Cohort Mart (`mart_customer_behavior`) */}
      <div className="border border-[#E2E8F0] bg-white rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            <div>
              <h3 className="text-base font-bold text-[#172B4D]">
                Customer Repeat Behavior & Cohort Spend (mart_customer_behavior)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Segmenting customers by lifetime order frequency at <code className="text-[#172B4D] font-mono">customer_unique_id</code> grain.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 bg-[#F1F5F9] text-[#334155] rounded-full uppercase">
            96,096 Distinct Customers
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#172B4D] font-semibold bg-[#F8FAFC]">
                <th className="py-2.5 px-3">Buyer Frequency Cohort</th>
                <th className="py-2.5 px-3 text-right">Distinct Customers</th>
                <th className="py-2.5 px-3 text-right">Total Orders</th>
                <th className="py-2.5 px-3 text-right">Total Cohort Spend</th>
                <th className="py-2.5 px-3 text-right">Avg Lifetime Spend</th>
                <th className="py-2.5 px-3 text-right">Avg Order Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {customerCohorts.map((c) => (
                <tr key={c.buyer_cohort} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-[#172B4D] font-sans">
                    {c.buyer_cohort}
                  </td>
                  <td className="py-3 px-3 text-right text-[#64748B]">
                    {c.distinct_customers.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-[#172B4D]">
                    {c.total_orders_placed.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-[#172B4D]">
                    R$ {c.total_cohort_spend.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="py-3 px-3 text-right text-[#64748B]">
                    R$ {c.avg_customer_lifetime_spend.toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">
                    R$ {c.avg_order_value.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fulfillment Performance Mart (`mart_fulfillment_performance`) */}
      <div className="border border-[#E2E8F0] bg-white rounded-xl p-6 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-[#E2E8F0] pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-600" />
            <div>
              <h3 className="text-base font-bold text-[#172B4D]">
                Logistics & Carrier SLA Tracking (mart_fulfillment_performance)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Monthly on-time delivery rates, carrier transit durations, and SLA buffer margins.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold px-2.5 py-1 bg-[#F1F5F9] text-[#334155] rounded-full uppercase">
            25 Months Audited
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E2E8F0] text-[#172B4D] font-semibold bg-[#F8FAFC]">
                <th className="py-2.5 px-3">Month</th>
                <th className="py-2.5 px-3 text-right">Orders Placed</th>
                <th className="py-2.5 px-3 text-right">Delivered</th>
                <th className="py-2.5 px-3 text-right">On-Time %</th>
                <th className="py-2.5 px-3 text-right">Avg Transit Days</th>
                <th className="py-2.5 px-3 text-right">Avg Total Days</th>
                <th className="py-2.5 px-3 text-right">Avg SLA Margin</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0] font-mono">
              {fulfillmentData.slice(0, 10).map((f) => (
                <tr key={f.order_month} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-semibold text-[#172B4D]">
                    {f.order_month}
                  </td>
                  <td className="py-3 px-3 text-right text-[#64748B]">
                    {f.total_orders_placed.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right text-[#172B4D]">
                    {f.delivered_orders.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className={`font-bold ${f.on_time_delivery_rate_pct >= 90 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {f.on_time_delivery_rate_pct.toFixed(1)}%
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right text-[#64748B]">
                    {f.avg_carrier_transit_days.toFixed(1)} d
                  </td>
                  <td className="py-3 px-3 text-right text-[#64748B]">
                    {f.avg_total_delivery_days.toFixed(1)} d
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-emerald-700">
                    +{f.avg_sla_margin_days.toFixed(1)} d
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
