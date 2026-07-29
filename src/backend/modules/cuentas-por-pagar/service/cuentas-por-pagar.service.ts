import type {
   ICuentasPorPagarRepository,
   CuentasPorPagarFiltros,
   CuentasPorPagarResult,
} from "../domain/cuentas-por-pagar.domain";

export class CuentasPorPagarService {
   constructor(private readonly repo: ICuentasPorPagarRepository) {}

   async listar(filtros: CuentasPorPagarFiltros): Promise<CuentasPorPagarResult> {
      if (filtros.fecha_desde && filtros.fecha_hasta) {
         if (new Date(filtros.fecha_hasta) < new Date(filtros.fecha_desde)) {
            throw new Error("La fecha final no puede ser anterior a la inicial");
         }
      }
      return await this.repo.listar(filtros);
   }
}
