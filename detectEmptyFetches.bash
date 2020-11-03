rm results.out
for file in pages/*
do
    file -I "$file" >> results.out
done
