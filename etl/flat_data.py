from etl.connection import (read_csv_and_insert,
                            read_query_and_insert)

def get_flat_table():
    # Traigo la tabla de colaboradores:
    read_csv_and_insert('colaboradores_verticales')

    query = """
            --Union de todo con los campos pedidos, a una fecha dada para task y time_entry
            with base_query as(
            select id as "Id",title as "Title",work_item_type as "WorkItemType",status as "State",colaborador_asignado as "AssignedTo",
            team_project as "TeamProject", area_path as "AreaPath",start_date as "StartDate", completed_work as "CompletedWork",
            activity as "Actividad", parent_id as "IdAncestor"
            from tasks
            union all
            select id as "Id",title as "Title",work_item_type as "WorkItemType",status as "State",colaborador_asignado as "AssignedTo",
            team_project as "TeamProject", area_path as "AreaPath",cast(start_date as date) as "StartDate", completed_work as "CompletedWork",
            activity as "Actividad", parent_id as "IdAncestor"
            from time_entrys te
            )
            --Todos los campos de todos los workitems independientemente su tipo
            ,identity as (
            select id,t.work_item_type,t.title,t.parent_id  from tasks t
            union all
            select id,t.work_item_type,t.title,t.parent_id  from claims t
            union all
            select id,t.work_item_type,t.title,t.parent_id  from epics t
            union all
            select id,t.work_item_type,t.title,t.parent_id  from features t
            union all
            select id,t.work_item_type,t.title, null  from projects t
            union all
            select id,t.work_item_type,t.title,t.parent_id  from time_entrys t
            union all
            select id,t.work_item_type,t.title,t.parent_id  from unknowns t
            union all
            select id,t.work_item_type,t.title,t.parent_id  from user_storys t
            ) --project y user storys, costos y clientes	
            ,costos_clientes as(
            select id,sponsor as clientes,null as costos from projects
            union all
            select id, null as clientes , costos from user_storys
            ) --Se extrae info del primer padre. Esta info persiste
            , padres as(
            select bq.*,idt.work_item_type as "WorkItemTypeAncestor", idt.title as "TitleAncestor", idt.parent_id as abuelo
            from base_query bq
            left join identity idt
            on bq."IdAncestor"=idt.id
            ) --Se comienza a bucear 5 escalones hacia arriba hasta toparnos con la cima del arbol para cada registro
            ,escalon_2 as(
            select bq.*,idt.work_item_type as "WorkItemTypeAncestor_2", idt.parent_id as bisabuelo
            from padres bq
            left join identity idt
            on bq."abuelo"=idt.id
            )
            ,escalon_3 as (
            select bq.*,idt.work_item_type as "WorkItemTypeAncestor_3", idt.parent_id as tatarabuelo
            from escalon_2 bq
            left join identity idt
            on bq."bisabuelo"=idt.id
            )
            ,escalon_4 as (
            select bq.*,idt.work_item_type as "WorkItemTypeAncestor_4", idt.parent_id as superabuelo
            from escalon_3 bq
            left join identity idt
            on bq."tatarabuelo"=idt.id
            )
            ,escalon_5 as(
            select bq.*,idt.work_item_type as "WorkItemTypeAncestor_5", idt.parent_id as gigabuelo
            from escalon_4 bq
            left join identity idt
            on bq."superabuelo"=idt.id
            ) --nos quedamos con la ultima hoja de cada arbol	
            , ultima_hoja as(
            select es.*,
                case
                when "WorkItemTypeAncestor_5" is not null then superabuelo
                when "WorkItemTypeAncestor_4" is not null then tatarabuelo
                when "WorkItemTypeAncestor_3" is not null then bisabuelo
                when "WorkItemTypeAncestor_2" is not null then abuelo
                when "WorkItemTypeAncestor" is not null then "IdAncestor"
                else null
                end as rama_alta
            from escalon_5 es
            ) --Ahora me quedo con costos y clientes        
            ,casi_completo as (
            select uh."Id",uh."Title",uh."WorkItemType",uh."State",uh."AssignedTo",uh."TeamProject",uh."AreaPath",
            uh."StartDate",uh."CompletedWork",uh."Actividad", uh."IdAncestor",uh."WorkItemTypeAncestor",uh."TitleAncestor",
            cc.clientes as "Custom.Cliente", cc.costos "Custom.Costos"
            from ultima_hoja uh
            left join costos_clientes cc
            on cc.id=uh.rama_alta
            )--Remato joineando con la info de GEA
            select cc.*,cv."Vertical / Area" as "Vertical", cv."Seccion" as "Seccion",cv."Posicion" as "Posicion"
            from casi_completo cc
            left join colaboradores_verticales cv
            on cv."Colaborador" =cc."AssignedTo"
        """
    read_query_and_insert(query, 'flat')

    print("Tabla **flat** creada con éxito")