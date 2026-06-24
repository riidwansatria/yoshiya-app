create function pg_temp.normalize_menu_number_prefix(input_value text)
returns text
language plpgsql
immutable
as $$
declare
    circled_numbers constant text :=
        '①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿';
    menu_number integer;
    remainder text;
    digit_prefix text;
begin
    if input_value is null or input_value = '' then
        return input_value;
    end if;

    menu_number := strpos(circled_numbers, left(input_value, 1));
    if menu_number > 0 then
        remainder := substr(input_value, 2);
    elsif input_value ~ '^[0-9０-９]+' then
        digit_prefix := (regexp_match(input_value, '^([0-9０-９]+)'))[1];
        menu_number := translate(
            digit_prefix,
            '０１２３４５６７８９',
            '0123456789'
        )::integer;
        remainder := regexp_replace(input_value, '^[0-9０-９]+', '');
    else
        return input_value;
    end if;

    return menu_number::text
        || ' | '
        || ltrim(remainder, E' \t\r\n 　|｜');
end;
$$;

update public.menus
set name = pg_temp.normalize_menu_number_prefix(name),
    name_en = pg_temp.normalize_menu_number_prefix(name_en)
where restaurant_id = 'enkaijou'
  and (
      name is distinct from pg_temp.normalize_menu_number_prefix(name)
      or name_en is distinct from pg_temp.normalize_menu_number_prefix(name_en)
  );
