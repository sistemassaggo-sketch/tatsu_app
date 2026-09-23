"use client";

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis, Pie, PieChart } from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import type { ProductoVendido, VentaMensual, TipoVenta } from "@/lib/reportes";

const configVentas = { total: { label: "Ventas", color: "var(--color-chart-1)" } } satisfies ChartConfig;
const configProductos = { unidades: { label: "Unidades", color: "var(--color-chart-2)" } } satisfies ChartConfig;

const formatoCop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const chartConfig = {
  cantidad: {
    label: "Cotizaciones",
  },
  minoristas: {
    label: "Minoristas",
    color: "var(--color-chart-1)"
  },
  mayoristas: {
    label: "Mayoristas",
    color: "var(--color-chart-2)",
  },
} satisfies ChartConfig

function abreviarCop(valor: number) {
  if (valor >= 1_000_000) {
    return `$${(valor / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  }

  return valor >= 1_000 ? `$${Math.round(valor / 1_000)} mil` : `$${valor}`;
}

export default function GraficosReportes({
  ventasPorMes,
  productosMasVendidos,
  tipoVenta
}: {
  ventasPorMes: VentaMensual[];
  productosMasVendidos: ProductoVendido[];
  tipoVenta: TipoVenta
}) {
  const hayVentas = ventasPorMes.some((mes) => mes.total > 0);

  // Pie necesita un arreglo (una fila por porción), no el objeto {minoristas, mayoristas} directo.
  const datosTipoVenta = [
    { tipo: "minoristas", cantidad: tipoVenta.minoristas, fill: "var(--color-minoristas)" },
    { tipo: "mayoristas", cantidad: tipoVenta.mayoristas, fill: "var(--color-mayoristas)" },
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Ventas por mes</CardTitle>
          <CardDescription>Total de las legalizaciones (COP) de los últimos 12 meses.</CardDescription>
        </CardHeader>
        <CardContent>
          {hayVentas ? (
            <ChartContainer config={configVentas} className="aspect-auto h-[300px] w-full">
              <BarChart data={ventasPorMes} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="etiqueta" tickLine={false} axisLine={false} tickMargin={8} interval="preserveStartEnd" />
                <YAxis tickLine={false} axisLine={false} width={64} tickFormatter={abreviarCop} />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      formatter={(valor, _nombre, item) => (
                        <div className="grid gap-1">
                          <span className="font-medium">{formatoCop.format(Number(valor))}</span>
                          <span className="text-muted-foreground">
                            {Number(item.payload?.legalizaciones ?? 0)} legalizaciones
                          </span>
                        </div>
                      )}
                    />
                  }
                />
                <Bar dataKey="total" fill="var(--color-total)" radius={4} />
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground py-16 text-center text-sm">Aún no hay legalizaciones en este periodo.</p>
          )}
        </CardContent>
      </Card>

      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Productos más vendidos</CardTitle>
          <CardDescription>Top 10 por unidades en legalizaciones.</CardDescription>
        </CardHeader>
        <CardContent>
          {productosMasVendidos.length > 0 ? (
            <ChartContainer config={configProductos} className="aspect-auto h-[300px] w-full">
              <BarChart data={productosMasVendidos} layout="vertical" margin={{ top: 0, right: 32, left: 0, bottom: 0 }}>
                <CartesianGrid horizontal={false} />
                <YAxis dataKey="codigo" type="category" tickLine={false} axisLine={false} width={90} interval={0} />
                <XAxis type="number" hide />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(_etiqueta, datos) => {
                        const producto = datos[0]?.payload as ProductoVendido | undefined;
                        return producto ? `${producto.codigo} · ${producto.descripcion}` : "";
                      }}
                    />
                  }
                />
                <Bar dataKey="unidades" fill="var(--color-unidades)" radius={4}>
                  <LabelList dataKey="unidades" position="right" className="fill-foreground" fontSize={12} />
                </Bar>
              </BarChart>
            </ChartContainer>
          ) : (
            <p className="text-muted-foreground py-16 text-center text-sm">Aún no hay productos vendidos en legalizaciones.</p>
          )}
        </CardContent>
      </Card>

      <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Tipo de ventas</CardTitle>
        <CardDescription>Periodo de tiempo total</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[250px] pb-0 [&_.recharts-pie-label-text]:fill-foreground"
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent hideLabel />} />
            <Pie data={datosTipoVenta} dataKey="cantidad" label nameKey="tipo" />
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        <div className="flex items-center gap-2 leading-none font-medium">
          Trending up by 5.2% this month
        </div>
        <div className="leading-none text-muted-foreground">
          Showing total visitors for the last 6 months
        </div>
      </CardFooter>
    </Card>
    </div>
  );
}
